package expo.modules.eflowpdf
import android.graphics.PointF
import android.graphics.Path
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.graphics.image.PDImage
import com.tom_roush.pdfbox.cos.COSName
import com.tom_roush.pdfbox.contentstream.PDFGraphicsStreamEngine
import com.tom_roush.pdfbox.text.PDFTextStripper
import com.tom_roush.pdfbox.text.TextPosition
import kotlin.math.*

class LayoutText(private val pageHeight:Float): PDFTextStripper() {
 val pieces=mutableListOf<Map<String,Any>>()
 init { sortByPosition=true }
 override fun writeString(text:String,positions:MutableList<TextPosition>) {
  var group=mutableListOf<TextPosition>()
  fun flush(){if(group.isEmpty())return;val first=group.first();val last=group.last();val body=StringBuilder();var previous:TextPosition?=null;for(glyph in group){val prior=previous;if(prior!=null&&glyph.xDirAdj-prior.xDirAdj-prior.widthDirAdj>max(1f,prior.widthOfSpace*0.45f)&&!prior.unicode.endsWith(" ")&&!glyph.unicode.startsWith(" "))body.append(' ');body.append(glyph.unicode);previous=glyph};val value=body.toString().trim();if(value.isNotEmpty())pieces.add(mapOf("str" to value,"transform" to listOf(1,0,0,1,first.xDirAdj,pageHeight-first.yDirAdj),"width" to (last.xDirAdj+last.widthDirAdj-first.xDirAdj),"height" to first.heightDir));group=mutableListOf()}
  for(position in positions){val prior=group.lastOrNull();if(prior!=null&&(abs(position.yDirAdj-prior.yDirAdj)>2||position.xDirAdj-prior.xDirAdj-prior.widthDirAdj>max(6f,prior.widthOfSpace*1.6f)))flush();group.add(position)}
  flush()
 }
}
class LayoutRules(page:PDPage):PDFGraphicsStreamEngine(page){
 val rules=mutableListOf<List<Float>>()
 private var current=PointF(0f,0f);private var start=PointF(0f,0f)
 private val segments=mutableListOf<List<Float>>()
 private fun line(a:PointF,b:PointF){if(abs(a.x-b.x)<1.5||abs(a.y-b.y)<1.5)segments.add(listOf(min(a.x,b.x),min(a.y,b.y),max(a.x,b.x),max(a.y,b.y)))}
 override fun appendRectangle(p0:PointF,p1:PointF,p2:PointF,p3:PointF){line(p0,p1);line(p1,p2);line(p2,p3);line(p3,p0);current=p0;start=p0}
 override fun drawImage(image:PDImage){}
 override fun clip(windingRule:Path.FillType){}
 override fun moveTo(x:Float,y:Float){current=PointF(x,y);start=current}
 override fun lineTo(x:Float,y:Float){val next=PointF(x,y);line(current,next);current=next}
 override fun curveTo(x1:Float,y1:Float,x2:Float,y2:Float,x3:Float,y3:Float){current=PointF(x3,y3)}
 override fun getCurrentPoint():PointF=current
 override fun closePath(){line(current,start);current=start}
 override fun endPath(){segments.clear()}
 override fun strokePath(){rules.addAll(segments);segments.clear()}
 override fun fillPath(windingRule:Path.FillType){rules.addAll(segments);segments.clear()}
 override fun fillAndStrokePath(windingRule:Path.FillType){rules.addAll(segments);segments.clear()}
 override fun shadingFill(shadingName:COSName){}
}
