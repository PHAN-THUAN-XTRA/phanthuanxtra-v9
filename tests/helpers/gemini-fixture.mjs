export function geminiResponse(init) {
  const request=JSON.parse(init.body);
  const value=request.generationConfig.responseSchema.properties.boxes?{complete:true,boxes:[]}:{safe:true,certain:true};
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]});
}
