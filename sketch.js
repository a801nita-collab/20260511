let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = []; // 儲存多張耳環圖片的陣列
let currentEarringIndex = 1; // 預設為 1 (acc1_ring.png)
let fingerCount = 0; // 儲存當前手指數量

let maskImages = []; // 儲存臉譜圖片
let currentMaskIndex = 0;
let lastHandX = { 'Left': 0, 'Right': 0 }; // 記錄左右手前一幀的位置
let swipeThreshold = 50; // 揮動觸發門檻

// 追蹤模型載入狀態
let modelsReady = { faceMesh: false, handPose: false };

// preload() 函式會在 setup() 之前執行，用於載入外部資源
function preload() {
  // 載入 5 張耳環圖片
  earringImages[1] = loadImage('圖片/acc1_ring.png');
  earringImages[2] = loadImage('圖片/acc2_pearl.png');
  earringImages[3] = loadImage('圖片/acc3_tassel.png');
  earringImages[4] = loadImage('圖片/acc4_jade.png');
  earringImages[5] = loadImage('圖片/acc5_phoenix.png');

  // 載入臉譜圖片
  maskImages[0] = loadImage('臉譜/4379901.png');
  maskImages[1] = loadImage('臉譜/4379902.png');
  maskImages[2] = loadImage('臉譜/mask1_red.png');
  // 你可以在這裡繼續 add 更多臉譜，例如 maskImages[3] = ...
}

function setup() {
  // 建立填滿整個視窗的全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 啟動攝影機擷取功能
  capture = createCapture(VIDEO);
  // 隱藏預設出現在畫布下方的 HTML5 影片元件，改在畫布內手動繪製
  capture.hide();

  // 初始化 ml5 faceMesh 辨識模型 (v1 版本 API)
  faceMesh = ml5.faceMesh(capture, { maxFaces: 1 }, () => {
    console.log('faceMesh 模型已載入');
    modelsReady.faceMesh = true;
    startDetectionIfReady();
  });

  // 初始化 ml5 handPose 辨識模型
  handPose = ml5.handPose(capture, { maxHands: 2 }, () => {
    console.log('handPose 模型已載入');
    modelsReady.handPose = true;
    startDetectionIfReady();
  });
}

function startDetectionIfReady() {
  // 只有在兩個模型都載入完成後才啟動偵測
  if (modelsReady.faceMesh && modelsReady.handPose) {
    console.log('開始偵測...');
    faceMesh.detectStart(capture, gotFaces);
    handPose.detectStart(capture, gotHands);
  }
}

function gotFaces(results) {
  faces = results;
}

function gotHands(results) {
  hands = results;
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

  // 檢查手勢並更新耳環索引
  updateEarringSelection();

  // 偵測揮手邏輯
  checkHandSwipe();

  // 如果辨識到臉部，則繪製臉譜
  if (faces && faces.length > 0) {
    let face = faces[0];
    if (face.keypoints && face.keypoints.length > 1) {
      let nose = face.keypoints[1]; // 鼻尖
      let leftEdge = face.keypoints[234]; // 臉部左邊界
      let rightEdge = face.keypoints[454]; // 臉部右邊界

      let nx = map(nose.x, 0, capture.width, 0, displayW);
      let ny = map(nose.y, 0, capture.height, 0, displayH);
      let faceWidth = dist(leftEdge.x, leftEdge.y, rightEdge.x, rightEdge.y);
      let maskSize = map(faceWidth, 0, capture.width, 0, displayW) * 1.5; // 調整臉譜比例

      // 繪製目前的臉譜
      if (maskImages[currentMaskIndex]) {
        imageMode(CENTER);
        image(maskImages[currentMaskIndex], nx, ny, maskSize, maskSize);
      }
    }
  }

  // 如果辨識到臉部，則繪製耳垂位置 (預設顯示 acc1_ring.png)
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

      let earringSize = displayW * 0.12; // 根據影像寬度自動調整耳環大小

      // 繪製耳環圖片 (根據手勢識別的手指數量顯示)
      imageMode(CENTER);
      
      // 當偵測到 1-5 根手指時，顯示對應的耳環
      if (currentEarringIndex >= 1 && currentEarringIndex <= 5) {
        let img = earringImages[currentEarringIndex];
        
        if (img) {
          image(img, rx, ry, earringSize, earringSize);
          image(img, lx, ly, earringSize, earringSize);
        }
      }
    }
  }
  pop();

  // 繪製 UI 文字：顯示目前偵測到的手指數量
  fill(255, 255, 0); // 黃色文字
  stroke(0); // 黑色外框增加文字清晰度
  strokeWeight(4);
  textSize(48);
  textAlign(LEFT, TOP);
  text(`偵測手指數量: ${fingerCount}`, 40, 40);
}

function updateEarringSelection() {
  if (hands && hands.length > 0) {
    let hand = hands[0];
    let count = 0;

    // 辨識邏輯：比較指尖 (Tip) 與第三關節 (MCP) 的高度
    // 在 p5 座標系中，Y 越小代表位置越高
    
    // 食指 (Index Finger)
    if (hand.keypoints[8].y < hand.keypoints[5].y) count++;
    // 中指 (Middle Finger)
    if (hand.keypoints[12].y < hand.keypoints[9].y) count++;
    // 無名指 (Ring Finger)
    if (hand.keypoints[16].y < hand.keypoints[13].y) count++;
    // 小指 (Pinky)
    if (hand.keypoints[20].y < hand.keypoints[17].y) count++;
    
    // 拇指 (Thumb) 辨識邏輯：
    // 拇指通常是水平伸展，所以改用與手掌中心 (或索引點 2) 的水平距離來判斷
    // 這裡為了簡單直觀，判斷拇指尖與關節的相對位置
    let thumbIsOut = dist(hand.keypoints[4].x, hand.keypoints[4].y, hand.keypoints[9].x, hand.keypoints[9].y) > 
                     dist(hand.keypoints[3].x, hand.keypoints[3].y, hand.keypoints[9].x, hand.keypoints[9].y);
    if (thumbIsOut) count++;

    fingerCount = count; // 更新全域變數供 draw() 使用

    // 如果偵測到 1-5 根手指，則更新目前顯示的圖片索引
    if (count >= 1 && count <= 5) {
      currentEarringIndex = count;
    }
  } else {
    fingerCount = 0; // 畫面中沒有手時，數量重設為 0
  }
}

function checkHandSwipe() {
  if (hands && hands.length > 0 && faces.length > 0) {
    let face = faces[0];
    let faceCenterX = face.keypoints[1].x;
    let faceLeftX = face.keypoints[234].x; // 臉部左邊界
    let faceRightX = face.keypoints[454].x; // 臉部右邊界

    for (let hand of hands) {
      let handX = hand.keypoints[9].x; // 中指根部作為手掌中心點
      let label = hand.handedness; // 'Left' 或 'Right'

      // 檢查手是否在臉部區域內移動
      let isHandInFaceRegion = handX >= faceLeftX && handX <= faceRightX;
      let wasHandInFaceRegion = lastHandX[label] >= faceLeftX && lastHandX[label] <= faceRightX;

      // 如果手剛進入臉部區域（從外面進入）
      if (isHandInFaceRegion && !wasHandInFaceRegion && lastHandX[label] !== 0) {
        if (label === 'Right') {
          currentMaskIndex = (currentMaskIndex + 1) % maskImages.length;
        } else if (label === 'Left') {
          currentMaskIndex = (currentMaskIndex - 1 + maskImages.length) % maskImages.length;
        }
      }

      lastHandX[label] = handX;
    }
  }
}

function windowResized() {
  // 當瀏覽器視窗大小改變時，動態調整畫布大小
  resizeCanvas(windowWidth, windowHeight);
}
