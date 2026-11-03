import {readProjectDocument,type NativePdf} from '../../../../../../platform/pdf';
export async function extractTextFromPdf(file:File):Promise<string>{return readProjectDocument(file as unknown as NativePdf);}
