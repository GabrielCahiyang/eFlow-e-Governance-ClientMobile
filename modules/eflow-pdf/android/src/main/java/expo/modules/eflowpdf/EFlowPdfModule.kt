package expo.modules.eflowpdf
import android.net.Uri
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
class EFlowPdfModule: Module() {
 override fun definition()=ModuleDefinition {
  Name("EFlowPdf")
  AsyncFunction("extractLayout") { uri:String ->
   val context=appContext.reactContext ?: throw IllegalStateException("Application context unavailable")
   val parsed=Uri.parse(uri);require(parsed.scheme=="file" || parsed.scheme=="content") { "Choose a local PDF file" }
   PDFBoxResourceLoader.init(context.applicationContext)
   context.contentResolver.openInputStream(parsed).use { stream ->
    requireNotNull(stream) { "The PDF could not be opened" }
    PDDocument.load(stream).use { document ->
     require(!document.isEncrypted && document.numberOfPages<=500) { "Use an unlocked PDF up to 500 pages" }
     var characters=0
     (0 until document.numberOfPages).map { index ->
      val page=document.getPage(index);require(page.rotation==0) { "Rotate PDF pages upright before importing" }
      val text=LayoutText(page.mediaBox.height);text.startPage=index+1;text.endPage=index+1;text.getText(document)
      characters+=text.pieces.sumOf { (it["str"] as String).length };require(characters<=500000) { "Import the document in smaller sections" }
      val rules=LayoutRules(page);rules.processPage(page)
      mapOf("items" to text.pieces,"rules" to rules.rules)
     }
    }
   }
  }
  AsyncFunction("extractText") { uri:String ->
   val context=appContext.reactContext ?: throw IllegalStateException("Application context unavailable")
   val parsed=Uri.parse(uri)
   require(parsed.scheme=="file" || parsed.scheme=="content") { "Choose a local PDF file" }
   PDFBoxResourceLoader.init(context.applicationContext)
   context.contentResolver.openInputStream(parsed).use { stream ->
    requireNotNull(stream) { "The PDF could not be opened" }
    PDDocument.load(stream).use { document ->
     require(document.numberOfPages<=500) { "Import PDFs of up to 500 pages" }
     require(!document.isEncrypted) { "Unlock the PDF before importing it" }
     val stripper=PDFTextStripper();stripper.sortByPosition=true
     val text=StringBuilder()
     for(page in 1..document.numberOfPages){stripper.startPage=page;stripper.endPage=page;text.append(stripper.getText(document));require(text.length<=500000){"Import the document in smaller sections"}}
     text.toString()
    }
   }
  }
 }
}
