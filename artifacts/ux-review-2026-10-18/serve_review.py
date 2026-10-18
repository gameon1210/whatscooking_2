"""Serve the source revision reviewed in this usability pass, on localhost only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent / 'web-export'

class ReviewPreview(SimpleHTTPRequestHandler):
    def do_GET(self):
        requested = urlsplit(self.path).path
        if not Path(self.translate_path(requested)).exists() and not Path(requested).suffix:
            self.path = '/index.html'
        super().do_GET()

if __name__ == '__main__':
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('Export the review build first.')
    print('Review preview: http://127.0.0.1:8089', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8089), partial(ReviewPreview, directory=str(ROOT))).serve_forever()
