import ExpoModulesCore
import PDFKit
public class EFlowPdfModule: Module {
 public func definition() -> ModuleDefinition {
  Name("EFlowPdf")
  AsyncFunction("extractLayout") { (uri:String) throws -> [[String:Any]] in
   guard let url=URL(string:uri),url.isFileURL,let document=PDFDocument(url:url),!document.isLocked,document.pageCount<=500 else {throw NSError(domain:"EFlowPdf",code:1,userInfo:[NSLocalizedDescriptionKey:"Use an unlocked local PDF up to 500 pages"])}
   var pages:[[String:Any]]=[],characters=0
   for index in 0..<document.pageCount {
    guard let page=document.page(at:index),let ref=page.pageRef,page.rotation==0 else {throw NSError(domain:"EFlowPdf",code:2,userInfo:[NSLocalizedDescriptionKey:"Rotate PDF pages upright before importing"])}
    let pieces=nativePdfPieces(page);characters+=pieces.reduce(0){$0+($1["str"] as? String ?? "").count}
    if characters>500000 {throw NSError(domain:"EFlowPdf",code:3,userInfo:[NSLocalizedDescriptionKey:"Import the document in smaller sections"])}
    pages.append(["items":pieces,"rules":nativePdfRules(ref)])
   }
   return pages
  }
  AsyncFunction("extractText") { (uri:String) throws -> String in
   guard let url=URL(string:uri),url.isFileURL,let document=PDFDocument(url:url) else { throw NSError(domain:"EFlowPdf",code:1,userInfo:[NSLocalizedDescriptionKey:"The PDF could not be opened"]) }
   guard !document.isLocked,document.pageCount<=500 else { throw NSError(domain:"EFlowPdf",code:2,userInfo:[NSLocalizedDescriptionKey:"Unlock the PDF and use up to 500 pages"]) }
   var text=""
   for index in 0..<document.pageCount {
    text += (document.page(at:index)?.string ?? "") + "\n"
    if text.count>500000 { throw NSError(domain:"EFlowPdf",code:3,userInfo:[NSLocalizedDescriptionKey:"Import the document in smaller sections"]) }
   }
   return text
  }
 }
}
