import http.server
import socketserver
import os

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor iniciado en http://localhost:{PORT}")
    print("Presiona Ctrl+C para detener")
    httpd.serve_forever()
