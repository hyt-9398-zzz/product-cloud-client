export const expectedOrigin='https://hyt-9398-zzz.github.io';
const endpoint='https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';

// A genuine browser request supplies Origin. Never invent Origin or Referer headers.
// Credentials are provided only to this invocation, never to page URLs or storage.
export async function readProducts(input,{fetcher=fetch,origin=globalThis.location?.origin}={}){
  if(origin!==expectedOrigin)throw Error('CLIENT_ORIGIN');
  if(typeof input?.applicationId!=='string'||!input.applicationId||typeof input.accessKey!=='string'||input.accessKey.length<20)throw Error('CLIENT_CREDENTIAL');
  if(typeof input.keyword!=='string'||!input.keyword.trim()||input.keyword.length>128)throw Error('CLIENT_KEYWORD');
  const limit=input.limit??5;
  if(!Number.isSafeInteger(limit)||limit<1||limit>30)throw Error('CLIENT_LIMIT');
  if(input.affiliateId!==undefined&&(!/^[a-f0-9]{8}\.[a-f0-9]{8}\.[a-f0-9]{8}\.[a-f0-9]{8}$/i.test(input.affiliateId)))throw Error('CLIENT_AFFILIATE_ID');
  const url=new URL(endpoint);
  const parameters={applicationId:input.applicationId,keyword:input.keyword,hits:String(limit),page:'1',availability:'1',format:'json',formatVersion:'2'};
  if(input.affiliateId){parameters.affiliateId=input.affiliateId;parameters.minPrice='500';parameters.maxPrice='3000';parameters.sort='-reviewCount';}
  url.search=new URLSearchParams(parameters).toString();
  let response;
  try{response=await fetcher(url,{method:'GET',headers:{accessKey:input.accessKey},credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});}
  catch{throw Error('CLIENT_NETWORK_OR_CORS');}
  if(!response.ok)throw Error('CLIENT_HTTP_'+response.status);
  let body;try{body=await response.json();}catch{throw Error('CLIENT_RESPONSE');}
  const rows=body.Items??body.items;
  if(!Array.isArray(rows))throw Error('CLIENT_RESPONSE');
  const items=rows.slice(0,limit).map(row=>row.Item??row.item??row);
  const serialized=JSON.stringify(items);
  if(serialized.includes(input.accessKey))throw Error('CLIENT_ACCESS_KEY_ECHO');
  // Application IDs may appear in provider tracking URLs. The access key must never appear.
  return {fetchedAt:new Date().toISOString(),items,requestCount:1};
}
if(typeof window!=='undefined'){
  // Nothing runs on page load. The isolated cloud browser invokes this explicitly.
  window.rakutenReadProducts=input=>readProducts(input);
  document.getElementById('status').textContent='準備できています。通常の閲覧では商品検索を実行しません。';
}
