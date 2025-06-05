import Foundation
import UIKit
import React

@objc(IGStoryShare)
class IGStoryShare: NSObject {
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override init() {
    super.init()
    print("🚀 IGStoryShare: Module initialized - NEW VERSION LOADED!")
  }
  
  @objc func shareToStory(_ pngPath: String, 
                          link: String, 
                          resolve: @escaping RCTPromiseResolveBlock, 
                          reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // Convert file path to image data - handle both file:// URLs and direct paths
      var url: URL
      
      if pngPath.hasPrefix("file://") {
        // It's already a file URL
        guard let fileURL = URL(string: pngPath) else {
          print("Failed to create URL from path: \(pngPath)")
          reject("URL_CREATION_ERROR", "Failed to create URL from path", nil)
          return
        }
        url = fileURL
      } else {
        // It's a direct file path
        url = URL(fileURLWithPath: pngPath)
      }
      
      print("IGStoryShare: Attempting to load image from URL: \(url)")
      print("IGStoryShare: URL path exists: \(FileManager.default.fileExists(atPath: url.path))")
      
      // Try different approaches to load the image
      var imageData: Data?
      
      // Approach 1: Direct Data loading
      imageData = try? Data(contentsOf: url)
      
      if imageData == nil {
        print("IGStoryShare: Direct loading failed, trying with security scope")
        // Approach 2: Try with security scoped resource
        if url.startAccessingSecurityScopedResource() {
          imageData = try? Data(contentsOf: url)
          url.stopAccessingSecurityScopedResource()
        }
      }
      
      if imageData == nil {
        print("IGStoryShare: All loading methods failed")
        // Try to get more info about the file
        do {
          let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
          print("IGStoryShare: File attributes: \(attributes)")
        } catch {
          print("IGStoryShare: Can't get file attributes: \(error)")
        }
        
        reject("IMAGE_LOAD_ERROR", "Failed to load image data from URL: \(url)", nil)
        return
      }
      
      print("IGStoryShare: Successfully loaded image data, size: \(imageData!.count) bytes")
      
      // Get the pasteboard
      let pasteboard = UIPasteboard.general
      
      // Clear existing items
      pasteboard.items = []
      
      // Set the background image for Instagram Stories
      pasteboard.setData(imageData!, forPasteboardType: "com.instagram.sharedSticker.backgroundImage")
      print("IGStoryShare: Image data written to pasteboard")
      
      // Set the content URL (App Store link)
      pasteboard.setValue(link, forPasteboardType: "com.instagram.sharedSticker.contentURL")
      print("IGStoryShare: App Store link written to pasteboard: \(link)")
      
      // Open Instagram Stories
      if let instagramURL = URL(string: "instagram-stories://share") {
        print("IGStoryShare: Opening Instagram Stories...")
        UIApplication.shared.open(instagramURL, options: [:]) { success in
          if success {
            print("IGStoryShare: Instagram Stories opened successfully")
            resolve("Instagram Stories opened successfully")
          } else {
            print("IGStoryShare: Failed to open Instagram Stories")
            reject("INSTAGRAM_OPEN_ERROR", "Failed to open Instagram Stories", nil)
          }
        }
      } else {
        print("IGStoryShare: Invalid Instagram Stories URL")
        reject("URL_ERROR", "Invalid Instagram Stories URL", nil)
      }
    }
  }
} 