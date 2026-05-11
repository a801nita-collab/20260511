let capture;
let faceLandmarks;
let faces = [];

function setup() {
  // 建立填滿整個視窗的全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 啟動攝影機擷取功能
  capture = createCapture(VIDEO);
  // 隱藏預設出現在畫布下方的 HTML5 影片元件，改在畫布內手動繪製
  capture.hide();

  // 初始化 ml5 faceLandmarks 辨識模型
  faceLandmarks = ml5.faceLandmarks(capture, { maxFaces: 1 }, modelReady);
}

function modelReady() {
  // 模型載入完成後開始偵測
  faceLandmarks.detectStart(capture, gotFaces);
}

function gotFaces(results) {
  // 更新辨識結果
  faces = results;
}

function draw() {
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算顯示影像的寬度與高度 (全螢幕寬高的 50%)
  let displayW = width * 0.5;
  let displayH = height * 0.5;

  // 計算將影像置於視窗中間的座標
  let x = (width - displayW) / 2;
  let y = (height - displayH) / 2;

  push();
  // 實作左右顛倒（鏡像效果）：
  // 1. 移動原點到影像預計顯示區域的右側邊界 (x + displayW)
  // 2. 利用 scale(-1, 1) 將水平軸反轉
  translate(x + displayW, y);
  scale(-1, 1);

  // 繪製影像，起始點設為 (0, 0)
  image(capture, 0, 0, displayW, displayH);

  // 如果辨識到臉部，則繪製耳垂位置
  if (faces.length > 0) {
    let face = faces[0];

    // 取得耳垂關鍵點 (177 為右耳垂區域，401 為左耳垂區域)
    let rightLobe = face.keypoints[177];
    let leftLobe = face.keypoints[401];

    fill(255, 255, 0); // 黃色
    noStroke();

    // 確保攝影機尺寸已讀取，以便進行座標對應 (Mapping)
    if (capture.width > 0) {
      // 將辨識座標從攝影機解析度對應到畫布上的顯示尺寸
      let rx = map(rightLobe.x, 0, capture.width, 0, displayW);
      let ry = map(rightLobe.y, 0, capture.height, 0, displayH);
      circle(rx, ry, 15);

      let lx = map(leftLobe.x, 0, capture.width, 0, displayW);
      let ly = map(leftLobe.y, 0, capture.height, 0, displayH);
      circle(lx, ly, 15);
    }
  }
  pop();
}

function windowResized() {
  // 當瀏覽器視窗大小改變時，動態調整畫布大小
  resizeCanvas(windowWidth, windowHeight);
}
