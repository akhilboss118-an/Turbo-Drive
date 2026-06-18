#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <shellapi.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "shell32.lib")

#define PORT 8080
#define BUFSIZE 65536

typedef struct { const char *ext, *mime; } MimeMap;
static MimeMap mime[] = {
    {".html","text/html"},{".js","text/javascript"},{".css","text/css"},
    {".png","image/png"},{".jpg","image/jpeg"},{".gif","image/gif"},
    {".svg","image/svg+xml"},{".json","application/json"},{".ico","image/x-icon"},
    {".woff","font/woff"},{".woff2","font/woff2"},{".mp3","audio/mpeg"},
    {".wav","audio/wav"},{".ogg","audio/ogg"},{".glb","model/gltf-binary"},
    {".gltf","model/gltf+json"},{".hdr","image/vnd.radiance"},
    {NULL,NULL}
};

static const char *get_mime(const char *path) {
    const char *dot = strrchr(path, '.');
    if (!dot) return "application/octet-stream";
    for (MimeMap *m = mime; m->ext; m++)
        if (_stricmp(dot, m->ext) == 0) return m->mime;
    return "application/octet-stream";
}

static void serve_client(SOCKET client) {
    char buf[BUFSIZE];
    int n = recv(client, buf, sizeof(buf)-1, 0);
    if (n <= 0) { closesocket(client); return; }
    buf[n] = 0;

    char method[16], path[1024];
    if (sscanf(buf, "%15s %1023s", method, path) < 2) { closesocket(client); return; }

    char *decoded = (char*)malloc(strlen(path)+1), *d = decoded;
    for (const char *s = path; *s; s++) {
        if (*s == '%' && s[1] && s[2]) { char h[3]={s[1],s[2],0}; *d++=(char)strtol(h,NULL,16); s+=2; }
        else if (*s == '+') { *d++=' '; } else { *d++=*s; }
    }
    *d = 0;
    if (strcmp(decoded, "/") == 0) strcpy(decoded, "/index.html");

    char fullpath[MAX_PATH];
    GetModuleFileNameA(NULL, fullpath, sizeof(fullpath));
    char *p = strrchr(fullpath, '\\');
    if (p) *p = 0;
    strcat(fullpath, decoded);
    free(decoded);

    HANDLE hFile = CreateFileA(fullpath, GENERIC_READ, FILE_SHARE_READ, NULL,
                               OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hFile == INVALID_HANDLE_VALUE) {
        const char *resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot found";
        send(client, resp, strlen(resp), 0);
    } else {
        DWORD fsize = GetFileSize(hFile, NULL);
        const char *mime_type = get_mime(fullpath);
        char header[512];
        int hlen = snprintf(header, sizeof(header),
            "HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %lu\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
            mime_type, fsize);
        send(client, header, hlen, 0);
        char filebuf[8192]; DWORD read;
        while (ReadFile(hFile, filebuf, sizeof(filebuf), &read, NULL) && read > 0)
            send(client, filebuf, read, 0);
        CloseHandle(hFile);
    }
    closesocket(client);
}

static void launch_app(const char *url) {
    // Try Edge app mode first (frameless window, looks like native app)
    const char *browsers[][2] = {
        {"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "\"--app=%s\" --no-first-run --no-default-browser-check"},
        {"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "\"--app=%s\" --no-first-run --no-default-browser-check"},
        {"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", "\"--app=%s\" --no-first-run --no-default-browser-check"},
        {"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "\"--app=%s\" --no-first-run --no-default-browser-check"},
        {NULL, NULL}
    };

    for (int i = 0; browsers[i][0]; i++) {
        if (GetFileAttributesA(browsers[i][0]) != INVALID_FILE_ATTRIBUTES) {
            char args[1024];
            snprintf(args, sizeof(args), browsers[i][1], url);
            STARTUPINFO si = { sizeof(si) };
            PROCESS_INFORMATION pi;
            if (CreateProcessA(browsers[i][0], args, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                return;
            }
        }
    }

    // Fallback: open in default browser
    ShellExecuteA(NULL, "open", url, NULL, NULL, SW_SHOWNORMAL);
}

int WINAPI WinMain(HINSTANCE hi, HINSTANCE hpi, LPSTR c, int s) {
    WSADATA wsa;
    WSAStartup(MAKEWORD(2,2), &wsa);
    SOCKET server = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(PORT);
    addr.sin_addr.s_addr = INADDR_ANY;
    bind(server, (struct sockaddr*)&addr, sizeof(addr));
    listen(server, SOMAXCONN);
    Sleep(500);
    launch_app("http://localhost:8080");
    for (;;) {
        SOCKET client = accept(server, NULL, NULL);
        if (client == INVALID_SOCKET) break;
        serve_client(client);
    }
    closesocket(server);
    WSACleanup();
    return 0;
}
