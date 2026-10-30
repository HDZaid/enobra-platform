// API e iframe interceptados: no prueba reproducción externa ni escribe datos.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true});try{const page=await browser.newPage();let presentation=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({presentation,signature:'Equipo',role:'Equipo',vision:'Vision',mission:'Mision',principles:[]})}));
await page.route('https://www.youtube-nocookie.com/**',r=>r.abort());
for(const width of [1440,390]){
await page.setViewportSize({width,height:900});
for(const content of [[],['  '],['Historia del servidor visible.']]){
presentation=content;await page.goto(`${process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'}/nosotros`);
if(content[0]?.trim())await page.locator('#presentation').getByText(content[0],{exact:true}).waitFor();
else {await page.locator('#presentation p').first().waitFor();assert.ok((await page.locator('#presentation').innerText()).includes('2003'));}
assert.equal(await page.locator('.institutional').getByRole('status').count(),0);
assert.equal(await page.locator('.institutional').getByRole('button',{name:'Reintentar'}).count(),0);
await page.locator('#presentation').scrollIntoViewIfNeeded();assert.ok(await page.locator('#presentation p').first().isVisible());
const iframe=page.locator('iframe');const url=new URL(await iframe.getAttribute('src'));assert.equal(url.searchParams.get('autoplay'),'1');assert.equal(url.searchParams.get('mute'),'1');assert.ok((await iframe.getAttribute('allow')).includes('autoplay'));assert.equal(await iframe.getAttribute('loading'),'eager');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
}}
assert.deepEqual(errors,[]);console.log('PASS: historia vacía/blanca conserva texto sin avisos técnicos, historia real visible, escritorio/móvil y autoplay silenciado/eager configurado.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
