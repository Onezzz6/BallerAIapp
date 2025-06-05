import Foundation
import UIKit

@objc(IGStoryShare)
class IGStoryShare: NSObject {
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func shareToStory(_ pngPath: String, link: String) {
    DispatchQueue.main.async {
      // Convert file path to image data
      guard let url = URL(string: pngPath),
            let imageData = try? Data(contentsOf: url) else {
        print("Failed to load image data from path: \(pngPath)")
        return
      }
      
      // Get the pasteboard
      let pasteboard = UIPasteboard.general
      
      // Clear existing items
      pasteboard.items = []
      
      // Set the background image for Instagram Stories
      pasteboard.setData(imageData, forPasteboardType: "com.instagram.sharedSticker.backgroundImage")
      
      // Set the content URL (App Store link)
      pasteboard.setValue(link, forPasteboardType: "com.instagram.sharedSticker.contentURL")
      
      // Open Instagram Stories
      if let instagramURL = URL(string: "instagram-stories://share") {
        UIApplication.shared.open(instagramURL, options: [:], completionHandler: nil)
      }
    }
  }
} 