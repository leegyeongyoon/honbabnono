#import "SimpleNotificationModule.h"
#import <React/RCTLog.h>

@implementation SimpleNotificationModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

RCT_EXPORT_METHOD(testAlert:(NSString *)message)
{
    RCTLogInfo(@"🔔 [SimpleNotificationModule] testAlert called: %@", message);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"테스트"
                                                                       message:message
                                                                preferredStyle:UIAlertControllerStyleAlert];
        
        UIAlertAction *okAction = [UIAlertAction actionWithTitle:@"확인"
                                                           style:UIAlertActionStyleDefault
                                                         handler:nil];
        [alert addAction:okAction];
        
        UIViewController *rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
        [rootViewController presentViewController:alert animated:YES completion:nil];
    });
}

RCT_EXPORT_METHOD(scheduleNotification:(NSString *)title body:(NSString *)body delay:(NSNumber *)delay)
{
    RCTLogInfo(@"🔔 [SimpleNotificationModule] scheduleNotification called: %@ - %@ - %@s", title, body, delay);
    
    dispatch_async(dispatch_get_main_queue(), ^{
        UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
        content.title = title;
        content.body = body;
        content.sound = [UNNotificationSound defaultSound];
        
        NSString *identifier = [[NSUUID UUID] UUIDString];
        UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger 
                                                       triggerWithTimeInterval:[delay doubleValue] 
                                                       repeats:NO];
        UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier 
                                                                              content:content 
                                                                              trigger:trigger];
        
        [[UNUserNotificationCenter currentNotificationCenter] 
         requestAuthorizationWithOptions:(UNAuthorizationOptionAlert + UNAuthorizationOptionSound + UNAuthorizationOptionBadge) 
         completionHandler:^(BOOL granted, NSError * _Nullable error) {
            RCTLogInfo(@"🔑 [SimpleNotificationModule] Permission granted: %d", granted);
            
            [[UNUserNotificationCenter currentNotificationCenter] 
             addNotificationRequest:request 
             withCompletionHandler:^(NSError * _Nullable error) {
                if (error) {
                    RCTLogError(@"❌ [SimpleNotificationModule] Failed: %@", error);
                } else {
                    RCTLogInfo(@"✅ [SimpleNotificationModule] Notification scheduled successfully");
                }
            }];
        }];
    });
}

@end