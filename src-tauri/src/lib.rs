use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    api_key: Mutex<String>,
}

fn parse_http_get(path: &str) -> Option<String> {
    let (path, _) = path.split_once(' ')?;
    let (_, path) = path.split_once(' ').unwrap_or(("", ""));
    let path = path.trim();
    let query = path.split('?').nth(1)?;
    for pair in query.split('&') {
        if let Some((key, val)) = pair.split_once('=') {
            if key == "code" {
                return Some(urlencoding_decode(val));
            }
        }
    }
    None
}

fn urlencoding_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

#[tauri::command]
fn google_sign_in(api_key: String) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);
    let client_id = "508238787402-7d4kq0i8qu4jh9qkfp0jnq1vsd7mjrci.apps.googleusercontent.com";
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid+email+profile",
        client_id,
        urlencoding_encode(&redirect_uri)
    );

    std::process::Command::new("cmd")
        .arg("/c")
        .arg("start")
        .arg("")
        .arg(&auth_url)
        .spawn()
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;

    let start = std::time::Instant::now();
    let mut auth_code: Option<String> = None;

    while start.elapsed() < std::time::Duration::from_secs(120) {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buf = [0u8; 4096];
                let n = stream.read(&mut buf).unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]);

                let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<html><body><h1>Signed in!</h1><p>You can close this window and return to Turbo Drive.</p><script>window.close()</script></body></html>";

                if let Some(code) = parse_http_get(&request) {
                    auth_code = Some(code);
                    let _ = stream.write_all(response.as_bytes());
                    break;
                }
                let _ = stream.write_all(response.as_bytes());
            }
            Err(_) => {
                std::thread::sleep(std::time::Duration::from_millis(200));
            }
        }
    }

    let code = auth_code.ok_or("Auth timeout or cancelled".to_string())?;

    let token_url = "https://oauth2.googleapis.com/token";
    let token_body = format!(
        "code={}&client_id={}&redirect_uri={}&grant_type=authorization_code",
        code, client_id, redirect_uri
    );

    let token_resp = ureq::post(token_url)
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send_string(&token_body)
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    let token_json: serde_json::Value = token_resp
        .into_json()
        .map_err(|e| format!("JSON parse error: {}", e))?;

    let id_token = token_json["id_token"]
        .as_str()
        .ok_or("No id_token in response")?
        .to_string();

    let firebase_url = format!(
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key={}",
        api_key
    );
    let firebase_body = serde_json::json!({
        "postBody": format!("id_token={}&providerId=google.com", id_token),
        "requestUri": redirect_uri,
        "returnSecureToken": true
    });

    let fb_resp = ureq::post(&firebase_url)
        .set("Content-Type", "application/json")
        .send_json(&firebase_body)
        .map_err(|e| format!("Firebase auth failed: {}", e))?;

    let fb_json: serde_json::Value = fb_resp
        .into_json()
        .map_err(|e| format!("Firebase JSON error: {}", e))?;

    let display_name = fb_json["displayName"].as_str().unwrap_or("Player");
    let email = fb_json["email"].as_str().unwrap_or("");
    let photo_url = fb_json["photoUrl"].as_str().unwrap_or("");
    let uid = fb_json["localId"].as_str().unwrap_or("");
    let firebase_token = fb_json["idToken"].as_str().unwrap_or("");

    let result = serde_json::json!({
        "uid": uid,
        "displayName": display_name,
        "email": email,
        "photoURL": photo_url,
        "idToken": firebase_token
    });

    Ok(result.to_string())
}

fn urlencoding_encode(s: &str) -> String {
    let mut result = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            b' ' => result.push_str("+"),
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![google_sign_in])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
