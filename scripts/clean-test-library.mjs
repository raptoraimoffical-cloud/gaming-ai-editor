import fs from 'node:fs';
import init from 'sql.js';
const p=new URL('../workspace/library.sqlite',import.meta.url);
if(fs.existsSync(p)){
 const SQL=await init();const db=new SQL.Database(fs.readFileSync(p));
 const rows=db.exec('SELECT id,data FROM media')[0]?.values||[];
 const testLicenses=['Generated Windows speech test fixture','Locally generated test pattern, not gameplay','Locally generated test tone'];
 for(const [id,data] of rows)if(testLicenses.includes(JSON.parse(data).license))db.run('DELETE FROM media WHERE id=?',[id]);
 fs.writeFileSync(p,db.export());db.close();
 console.log('Removed synthetic test entries from the application library; test artifacts retained.');
}
