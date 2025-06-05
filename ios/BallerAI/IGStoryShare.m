#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(IGStoryShare, NSObject)

RCT_EXTERN_METHOD(shareToStory:(NSString *)pngPath
                  link:(NSString *)link
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end 