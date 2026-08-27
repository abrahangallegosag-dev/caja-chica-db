from playwright.sync_api import sync_playwright
import http.server, socketserver, threading, os
os.chdir('.')
PORT=8900
httpd=socketserver.TCPServer(("",PORT),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
mock='''
window.__of=window.fetch;
window.fetch=async(u,o)=>{
 if(u.includes('/api/catalogos'))return{json:async()=>({proyectos:[{codigo:'ADM000',nombre:'Admin'}],centros_costo:[{codigo:'ISLA',nombre:'Isla'}]})};
 if(u.includes('/api/reposicion-actual'))return{json:async()=>({reposicion:{fondo:250,limite_comida:5},facturas:[
   {id:1,fecha:'2026-08-11',emisor:'A',numero:'001-001-000000123',descripcion:'MERIENDA',cc:'ISLA',codigo_proyecto:'ADM000',iva:0,total:5,excedente:0},
   {id:2,fecha:'2026-08-11',emisor:'B',numero:'001-001-000000123',descripcion:'MERIENDA',cc:'ISLA',codigo_proyecto:'ADM000',iva:0,total:6,excedente:1}
 ]})};
 return window.__of(u,o);
};
'''
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context()
    ctx.add_init_script(mock)
    pg=ctx.new_page()
    pg.goto(f'http://localhost:{PORT}/index.html')
    pg.wait_for_timeout(1500)
    pg.evaluate("exportar()")
    pg.wait_for_timeout(800)
    pg.screenshot(path='dlg_dup.png')
    b.close()
httpd.shutdown()
print('ok')
