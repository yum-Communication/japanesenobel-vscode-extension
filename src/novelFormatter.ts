import {
	config
} from './config';

export enum ConvertType {
	narou = 1,
	kakuyomu = 2,
	novelup = 3,
	html = 4
}

type NovelFormatter = (row:string)=>string;

function makeReplaceChars(indentNum:number, charType:string):string {
	let ic = " ";
	switch(charType)
	{
		case "全角空白":
			ic = "　";
			break;
		case "タブ":
			ic = "	";
			break;
		case "EM SP":
			ic = "\u2003";
			break;
	}
	let r = ic.repeat(indentNum);
	return r;
}

/**
 * インデントを除去する関数を返す
 * @returns インデントを除去する関数
 */
function rmParagraphIndent(): NovelFormatter
{
	const rgx1:RegExp = /^\s+/;
	const rgx2:RegExp = /\s+$/;
	return (row:string) => row.replace(rgx1, "").replace(rgx2, "");
}

/**
 * 段落先頭にインデントを挿入する関数を返す
 * @param indentNum インデントの数
 * @param charType インデントに使用する文字の種別
 * @returns インデントを挿入する関数
 */
function addParagraphIndent(indentNum:number, charType:string): NovelFormatter
{
	const rgx = /^(?!「|$)/;
	const c = makeReplaceChars(indentNum, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 台詞先頭にインデントを挿入する関数を返す
 * @param indentNum インデントの数
 * @param charType インデントに使用する文字の種別
 * @returns インデントを挿入する関数
 */
function addDialogueIndent(indentNum:number, charType:string): NovelFormatter
{
	const rgx = /^(?=「)/;
	const c = makeReplaceChars(indentNum, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 疑問符・感嘆符の後に空白を追加する
 * @param charType 追加する空白の種別
 * @returns 空白を挿入する関数
 */
function addSpaceAfterExclamation(charType:string): NovelFormatter
{
	const rgx = /([!?！？⁇⁈⁉])(?![!?！？⁇⁈⁉（）［］「」『』》])/g;
	const c = "$1" + makeReplaceChars(1, charType);
	return (row:string) => row.replace(rgx, c);
}

/**
 * 疑問符・感嘆符の後の空白を除去する
 * @returns 除去する関数
 */
function rmSpaceAfterExclamation(): NovelFormatter
{
	const rgx = /(?<=[!?！？⁇⁈⁉])[\s　]+/g;
	return (row:string) => row.replace(rgx, "");
}

/**
 * 台詞の閉じ括弧前に句点を追加する
 * @returns 
 */
function addPeriodAtEndOfDialogue(): NovelFormatter
{
	const rgx = /([^!?！？⁇⁈⁉。．…」])(?=[」])/g;
	return (row:string) => row.replace(rgx, "$1。");
}

/**
 * 台詞の閉じ括弧前の句点を削除する
 * @returns 
 */
function rmPeriodAtEndOfDialogue(): NovelFormatter
{
	const rgx = /。(?=」)/g;
	return (row:string) => row.replace(rgx, "");
 }

/**
 * 傍点を『小説家になろう』向けに変換する
 * @returns 
 */
function emphasisToNarou(): NovelFormatter
{
	const emphasisMark = "《" + config.format.emphasisMark.substr(0, 1) + "》";
	return (row:string) => {
		const rgx = /#<(.+?)#>/g;
		const rgx2 = /[\u3099\u309a]|[\uDB40][\udd00-\uddef]|[\uFE00-\uFE0f]/;

		let m:RegExpExecArray;
		let replArray:string[][] = [];
		while((m = rgx.exec(row)) !== null)
		{
			let after:string = "";
			let b:string[] = [...m[1]];
			let a:string[] = [];
			// 二文字を無理矢理一文字にする
			for(let i=0; i<b.length; ++i)
			{
				if(rgx2.test(b[i]))
				{
					a[a.length-1] += b[i];
				} else {
					a.push(b[i]);
				}
			}

			for(let i=0; i<a.length; ++i)
			{
				after += "｜" + a[i] + emphasisMark;
			}
			replArray.push([m[0], after]);
		}
		replArray.forEach(ss => {
			row = row.replace(ss[0], ss[1]);
		});
		return row;
	 };
 }

/**
 * 
 * @returns 傍点をカクヨム向けに変換する
 */
function emphasisToKakuyomu(): NovelFormatter
{
	// 傍点指定を全く違う形式にして、エスケープに正しく対応できるようにする
	const rgx1 = /#/g;
	//（通常単独文字 or サロゲートペア）＋（濁点・半濁点合成 or 異字体セレクタ）
	const rgx2 = /[|｜](([\u0000-\ud7ff\uf000-\uffff]|[\ud800-\udbff][\udc00-\udfff])([\u3099\u309a]|[\udb40][\udd00-\uddef]|[\ufe00-\ufe0f])?)《[・●○﹅﹆]》/g;
	const rgx3 = /(?<![|｜])《《([^|｜《》]+)》》/g;
	const rgx4 = /#>#</g;
	const rgx5 = /(?<=#<(#[^>]|[^#])*)([ 　!?！？⁇⁈⁉]+)(?=.*#>)/g;
	const rgx6 = /#<#>/g;
	return (row:string) => {
		return row.replace(rgx1, '##').replace(rgx2, "#<$1#>").replace(rgx3, "#<$1#>").replace(rgx4, "").replace(rgx5, "#>$2#<").replace(rgx6, "");
	 };
 }

/**
 * 
 * @returns 傍点を内部形式から変換する
 */
function emphasisConv(): NovelFormatter
{
	const rgx1 = /#</g;
	const rgx2 = /#>/g;
	const rgx3 = /##/g;
	return (row:string) => {
		return row.replace(rgx1, '《《').replace(rgx2, "》》").replace(rgx3, "#");
	};
}
 
export function formatDocument(s:string, convertType:ConvertType): string {
	let formatter:NovelFormatter[] = [];

	let cf = config.format;

	// インデントおよび行末の空白は一度全て除去する
	formatter.push(rmParagraphIndent());
	// 必要ならば段落のインデントをする
	if( cf.paragraphIndentNum > 0 )
	{
		formatter.push(addParagraphIndent(cf.paragraphIndentNum, cf.paragraphIndentType));
	}
	// 必要ならば台詞のインデントをする
	if( cf.dialogueIndentNum > 0 )
	{
		formatter.push(addDialogueIndent(cf.dialogueIndentNum, cf.dialogueIndentType));
	}
	// 台詞末尾の句点
	if( cf.periodAtEndOfDialogue !== "そのまま" )
	{
		// 一度削除する
		formatter.push(rmPeriodAtEndOfDialogue());
		// 必要ならば追加する
		if( cf.periodAtEndOfDialogue === "追加" )
		{
			formatter.push(addPeriodAtEndOfDialogue());
		}
	}
	// 疑問符・感嘆符の後の空白
	if( cf.spaceAfterExclamation !== "そのまま" )
	{
		// 一度削除する
		formatter.push(rmSpaceAfterExclamation());
	}

	// 傍点記述を一度カクヨムに寄せる
	formatter.push(emphasisToKakuyomu());
	if(convertType ===ConvertType.narou || convertType ===ConvertType.novelup) {
		// ノベプラの傍点は、なろうと同じ。
		formatter.push(emphasisToNarou());
	}else
	{
		// 内部形式から変換
		formatter.push(emphasisConv());
	}

	// 疑問符・感嘆符の後の空白追加は最後にやる
	if( cf.spaceAfterExclamation === "追加")
	{
		formatter.push(addSpaceAfterExclamation(cf.spaceAfterExclamationType));
	}
	// 追加された空白が《ルビ指定》の直前だったら、後ろに移動
	formatter.push(row=>row.replace(/(?<=[|｜][^|｜《》]+)(\s)(《[^|｜《》]+》)/g, "$2$1"));

	// そして閉じ括弧の前の空白は強制除去
	formatter.push(row=>row.replace(/[\s　]+(?=[）」』］】》])/, ""));


	let ary:string[] = s.split("\n");
	let result:string[] = [];
	ary.forEach(row =>{
		let tmp:string = row;
		formatter.forEach(nf =>{
			tmp = nf(tmp);
		});
		result.push(tmp);
	});
	return result.join("\n");
 }
