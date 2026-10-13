import {pathToFileURL} from 'node:url';

export async function verifyLeadEmailReceipt({leadId,token,fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if (!Number.isSafeInteger(leadId) || leadId<1 || !token) throw new Error('Invalid receipt verification input');
  for(let attempt=0;attempt<12;attempt++) {
    const response=await fetchImpl('https://phanthuanxtra.com/api/admin/lead-email-outbox',{
      method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)
    });
    if(!response.ok)throw new Error(`Email receipt inspection HTTP ${response.status}`);
    const data=await response.json();
    const row=Array.isArray(data.receipts)?data.receipts.find(item=>item.lead_id===leadId):null;
    if(row && ['accepted','delivered'].includes(row.state) && row.provider_message_id && row.telegram_delivery_ok===1 && Number.isSafeInteger(row.telegram_message_id)) {
      return {lead_id:leadId,state:row.state,attempts:row.attempts,telegram_message_id:row.telegram_message_id,provider_message_id:row.provider_message_id};
    }
    if(row && ['blocked','failed','uncertain'].includes(row.state))throw new Error(`Email receipt requires reconciliation: ${row.state}`);
    if(attempt<11)await wait(3000);
  }
  throw new Error('Confirmed same-lead email/Telegram receipt unavailable; no resend attempted');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const receipt=await verifyLeadEmailReceipt({leadId:Number(process.env.LEAD_ID),token:process.env.PTX_EMAIL_RECEIPT_TOKEN});
  console.log('Same-lead D1/Telegram/Brevo receipt: '+JSON.stringify(receipt));
}
