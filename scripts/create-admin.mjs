import {randomBytes,scryptSync} from 'node:crypto';
import fs from 'node:fs';
const folder=new URL('../private/',import.meta.url),file=new URL('admin-setup.txt',folder);
fs.mkdirSync(folder,{recursive:true});
if(fs.existsSync(file))throw new Error('private/admin-setup.txt 已存在，请先保管现有配置；脚本不会覆盖管理员凭据。');
const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
const hash=`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`,secret=randomBytes(48).toString('base64url');
fs.writeFileSync(file,`管理员登录密码（仅供本人保管）：\n${password}\n\n在 Vercel Environment Variables 中添加：\nADMIN_PASSWORD_HASH=${hash}\nSESSION_SECRET=${secret}\n\n添加后重新部署。不要将此文件上传 GitHub。\n`,{flag:'wx',mode:0o600});
console.log('管理员配置已生成到 private/admin-setup.txt（已被 Git 忽略；终端未输出密码）。');
