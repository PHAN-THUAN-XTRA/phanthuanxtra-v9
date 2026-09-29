export const MEDIA_POLICY=Object.freeze({
  image:{maxInputBytes:15*1024*1024,maxPerArticle:20,canonicalFormat:'avif',deliveryFormats:['avif','webp'],maxWidth:1800,avifQuality:76,webpQuality:82},
  video:{maxSimpleUploadBytes:100*1024*1024,multipartAboveBytes:100*1024*1024,preferredContainer:'mp4',preferredVideoCodec:'h264',preferredAudioCodec:'aac'}
});
export const imageInputLimit=()=>MEDIA_POLICY.image.maxInputBytes;
