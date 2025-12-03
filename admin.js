// 管理画面から使うAPIはすべてここ

// 会員一覧
function getMembers(){
    return fetch(API+"?mode=getMembers").then(r=>r.json());
}

// 商品一覧
function getProducts(){
    return fetch(API+"?mode=getProducts").then(r=>r.json());
}
