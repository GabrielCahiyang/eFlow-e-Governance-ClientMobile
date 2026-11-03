import PDFKit
import CoreGraphics
private final class RuleState {
 var transform=CGAffineTransform.identity
 var stack:[CGAffineTransform]=[]
 var current=CGPoint.zero; var start=CGPoint.zero
 var path:[[CGFloat]]=[]; var rules:[[CGFloat]]=[]
 func line(_ point:CGPoint){if abs(current.x-point.x)<1.5 || abs(current.y-point.y)<1.5 {path.append([min(current.x,point.x),min(current.y,point.y),max(current.x,point.x),max(current.y,point.y)])};current=point}
 func commit(){rules.append(contentsOf:path);path=[]}
}
private func state(_ info:UnsafeMutableRawPointer?)->RuleState {Unmanaged<RuleState>.fromOpaque(info!).takeUnretainedValue()}
private func number(_ scanner:CGPDFScannerRef)->CGFloat {var value:CGPDFReal=0;CGPDFScannerPopNumber(scanner,&value);return CGFloat(value)}
private func point(_ scanner:CGPDFScannerRef,_ value:RuleState)->CGPoint {let y=number(scanner),x=number(scanner);return CGPoint(x:x,y:y).applying(value.transform)}
func nativePdfRules(_ page:CGPDFPage)->[[CGFloat]] {
 let value=RuleState(),operators=CGPDFOperatorTableCreate()!
 CGPDFOperatorTableSetCallback(operators,"m",{scanner,info in let s=state(info);let p=point(scanner,s);s.current=p;s.start=p})
 CGPDFOperatorTableSetCallback(operators,"l",{scanner,info in let s=state(info);s.line(point(scanner,s))})
 CGPDFOperatorTableSetCallback(operators,"re",{scanner,info in let s=state(info);let h=number(scanner),w=number(scanner),y=number(scanner),x=number(scanner);let corners=[CGPoint(x:x,y:y),CGPoint(x:x+w,y:y),CGPoint(x:x+w,y:y+h),CGPoint(x:x,y:y+h)].map{$0.applying(s.transform)};s.current=corners[0];s.start=corners[0];for p in corners.dropFirst(){s.line(p)};s.line(corners[0])})
 CGPDFOperatorTableSetCallback(operators,"h",{_,info in let s=state(info);s.line(s.start)})
 for op in ["S","f","F","f*","B","B*"]{CGPDFOperatorTableSetCallback(operators,op,{_,info in state(info).commit()})}
 for op in ["s","b","b*"]{CGPDFOperatorTableSetCallback(operators,op,{_,info in let s=state(info);s.line(s.start);s.commit()})}
 CGPDFOperatorTableSetCallback(operators,"n",{_,info in state(info).path=[]})
 CGPDFOperatorTableSetCallback(operators,"q",{_,info in let s=state(info);s.stack.append(s.transform)})
 CGPDFOperatorTableSetCallback(operators,"Q",{_,info in let s=state(info);s.transform=s.stack.popLast() ?? .identity})
 CGPDFOperatorTableSetCallback(operators,"cm",{scanner,info in let f=number(scanner),e=number(scanner),d=number(scanner),c=number(scanner),b=number(scanner),a=number(scanner);let s=state(info);s.transform=CGAffineTransform(a:a,b:b,c:c,d:d,tx:e,ty:f).concatenating(s.transform)})
 let stream=CGPDFContentStreamCreateWithPage(page)
 let pointer=Unmanaged.passUnretained(value).toOpaque()
 if let scanner=CGPDFScannerCreate(stream,operators,pointer){CGPDFScannerScan(scanner)}
 return value.rules
}
func nativePdfPieces(_ page:PDFPage)->[[String:Any]] {
 guard let content=page.string else{return []}
 var pieces:[[String:Any]]=[],text="",bounds=CGRect.null,last=CGRect.null
 func flush(){let value=text.trimmingCharacters(in:.whitespacesAndNewlines);if !value.isEmpty && !bounds.isNull {pieces.append(["str":value,"transform":[1,0,0,1,bounds.minX,bounds.minY],"width":bounds.width,"height":bounds.height])};text="";bounds = .null;last = .null}
 content.enumerateSubstrings(in:content.startIndex..<content.endIndex,options:.byComposedCharacterSequences){substring,range,_,_ in
  guard let character=substring else{return}
  if character.contains("\n")||character.contains("\r"){flush();return}
  if character.trimmingCharacters(in:.whitespaces).isEmpty{text+=character;return}
  guard let selection=page.selection(for:NSRange(range,in:content)) else{return}
  let box=selection.bounds(for:page)
  if !last.isNull && (abs(last.minY-box.minY)>2 || box.minX-last.maxX>6 || box.minX<last.minX-2){flush()}
  text+=character;bounds=bounds.union(box);last=box
 }
 flush();return pieces
}
