import { request } from './production-api.mjs';
const project = 'hamrosathi1', number = '932995524964', domain = 'hamrosathi.vercel.app';
if (process.env.SATHI_APPROVED_MEDIA_ROLLOUT !== project) throw new Error('Explicit approved project required');
const authUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
const configuration = await request(authUrl);
if (!configuration.authorizedDomains.includes(domain)) {
  await request(`${authUrl}?updateMask=authorizedDomains`, 'PATCH', { authorizedDomains: [...configuration.authorizedDomains, domain] });
}
console.log(JSON.stringify({ authorizedDomains:(await request(authUrl)).authorizedDomains }));
const service = `https://serviceusage.googleapis.com/v1/projects/${number}/services/recaptchaenterprise.googleapis.com`;
if ((await request(service)).state !== 'ENABLED') {
  console.log(JSON.stringify({ enabling:await request(`${service}:enable`,'POST',{}) }));
  // Enabling is asynchronous. Re-run this idempotent script after the operation completes.
  if ((await request(service)).state !== 'ENABLED') process.exit(0);
}
const keyUrl=`https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys`;
const keys=await request(keyUrl);
let key=keys.keys?.find(item=>item.displayName==='SATHI production App Check' && item.webSettings?.allowedDomains?.includes(domain));
if (!key) key=await request(keyUrl,'POST',{displayName:'SATHI production App Check',webSettings:{allowedDomains:[domain],allowAllDomains:false,integrationType:'SCORE'}});
const siteKey=key.name.split('/').at(-1);
const apps=(await request(`https://firebase.googleapis.com/v1beta1/projects/${project}/webApps`)).apps;
for(const app of apps) {
  const resource=`projects/${number}/apps/${app.appId}/recaptchaEnterpriseConfig`;
  await request(`https://firebaseappcheck.googleapis.com/v1/${resource}?updateMask=siteKey,tokenTtl`,'PATCH',{name:resource,siteKey,tokenTtl:'3600s'});
}
console.log(JSON.stringify({siteKey,domain,apps:apps.map(app=>app.appId),enforcement:'NOT CHANGED'}));
