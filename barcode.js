// 共通バーコード関連処理
// ZXing は各HTML内で直接使うため、ここではラッパーのみ

function generateBarcode(selector, text){
    JsBarcode(selector, text, {
        format:"CODE128",
        height:70,
        displayValue:true
    });
}
