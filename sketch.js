let capture;
let faceMesh;
let faces = [];
let earringImage; // 宣告耳環圖片變數

// preload() 函式會在 setup() 之前執行，用於載入外部資源
function preload() {
  earringImage = loadImage('圖片/acc1_ring.png'); // 載入耳環圖片，路徑已修正為 '圖片/acc1_ring.png'
}

function setup() {
  // 建立填滿整個視窗的全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 啟動攝影機擷取功能
  capture = createCapture(VIDEO);
  // 隱藏預設出現在畫布下方的 HTML5 影片元件，改在畫布內手動繪製
  capture.hide();

  // 初始化 ml5 faceMesh 辨識模型 (v1 版本 API)
  faceMesh = ml5.faceMesh(capture, { maxFaces: 1 }, modelReady);
}

function modelReady() {
  // 模型載入完成後開始偵測
  faceMesh.detectStart(capture, gotFaces);
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
  imageMode(CORNER); // 確保攝影機影像從左上角開始繪製
  image(capture, 0, 0, displayW, displayH);

  // 如果辨識到臉部，則繪製耳垂位置
  if (faces && faces.length > 0) {
    let face = faces[0];

    // 確保關鍵點存在
    if (face.keypoints && face.keypoints.length > 401) {
      // 取得耳垂關鍵點 (177 為右耳垂區域，401 為左耳垂區域)
      let rightLobe = face.keypoints[177];
      let leftLobe = face.keypoints[401];

      // 將辨識座標從攝影機解析度對應到畫布上的顯示尺寸
      let rx = map(rightLobe.x, 0, capture.width, 0, displayW);
      let ry = map(rightLobe.y, 0, capture.height, 0, displayH);
      let lx = map(leftLobe.x, 0, capture.width, 0, displayW);
      let ly = map(leftLobe.y, 0, capture.height, 0, displayH);

      // 繪製耳環圖片
      imageMode(CENTER);
      let earringSize = displayW * 0.08; // 根據影像寬度自動調整耳環大小
      
      // 只有在圖片成功載入後才繪製
      if (earringImage) {
        image(earringImage, rx, ry, earringSize, earringSize);
        image(earringImage, lx, ly, earringSize, earringSize);
      }
    }
  }
  pop();
}

function windowResized() {
  // 當瀏覽器視窗大小改變時，動態調整畫布大小
  resizeCanvas(windowWidth, windowHeight);
}
