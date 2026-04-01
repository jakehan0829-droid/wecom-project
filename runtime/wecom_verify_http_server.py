from http.server import BaseHTTPRequestHandler, HTTPServer

VERIFY_PATH = '/WW_verify_9eeNwHyqReXWhJZS.txt'
VERIFY_BODY = b'9eeNwHyqReXWhJZS'

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == VERIFY_PATH:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(VERIFY_BODY)))
            self.end_headers()
            self.wfile.write(VERIFY_BODY)
            return
        self.send_response(404)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'not found')

    def log_message(self, format, *args):
        return

HTTPServer(('0.0.0.0', 80), Handler).serve_forever()
