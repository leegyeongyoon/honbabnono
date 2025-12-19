#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <UserNotifications/UserNotifications.h>

@interface NativeBridgeModule : NSObject <RCTBridgeModule>
@end

@implementation NativeBridgeModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_METHOD(scheduleNotification:(NSString *)title body:(NSString *)body delay:(NSNumber *)delay data:(NSDictionary *)data)
{
  RCTLogInfo(@"🔔 [Objective-C] scheduleNotification called: %@ - %@ - %@s", title, body, delay);
  
  dispatch_async(dispatch_get_main_queue(), ^{
    UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
    content.title = title;
    content.body = body;
    content.sound = [UNNotificationSound defaultSound];
    content.badge = @1;
    
    if (data) {
      content.userInfo = data;
    }
    
    NSString *identifier = [[NSUUID UUID] UUIDString];
    UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:[delay doubleValue] repeats:NO];
    UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];
    
    [[UNUserNotificationCenter currentNotificationCenter] requestAuthorizationWithOptions:(UNAuthorizationOptionAlert + UNAuthorizationOptionSound + UNAuthorizationOptionBadge) completionHandler:^(BOOL granted, NSError * _Nullable error) {
      RCTLogInfo(@"🔑 [Objective-C] Notification permission: %d", granted);
      
      [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
        if (error) {
          RCTLogError(@"❌ [Objective-C] Notification scheduling failed: %@", error);
        } else {
          RCTLogInfo(@"✅ [Objective-C] Notification scheduled successfully");
        }
      }];
    }];
  });
}

@end