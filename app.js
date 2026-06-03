const state = {
  photoDataUrl: "",
  activeCard: "makeup",
  generated: false,
  generatedSnapshot: null,
};

const cardNames = {
  makeup: "妆容分析",
  image: "形象分析",
  hair: "发型分析",
  outfit: "穿搭分析",
};

const profiles = {
  natural: {
    title: "自然清透",
    keywords: ["清透", "自然", "灵动"],
    makeup: ["轻透底妆", "自然眉形", "豆沙唇色"],
    colors: ["#d9a27f", "#f0b493", "#d85f66", "#9b5639", "#7a4a32"],
    clothes: ["米白", "浅粉", "雾蓝", "薄荷绿", "浅卡其"],
    hair: ["自然黑", "冷茶棕", "柔棕色"],
  },
  cool: {
    title: "清冷简约",
    keywords: ["清冷", "简约", "高级"],
    makeup: ["雾面底妆", "利落眉眼", "低饱和唇"],
    colors: ["#2d3131", "#ffffff", "#b7b4b5", "#765449", "#8f5360"],
    clothes: ["黑色", "白色", "冷灰", "深棕", "雾粉"],
    hair: ["自然黑", "冷棕深", "黑茶色"],
  },
  sweet: {
    title: "甜美温柔",
    keywords: ["温柔", "甜美", "亲和"],
    makeup: ["柔焦底妆", "卧蚕提亮", "蜜桃唇色"],
    colors: ["#f1b6a7", "#e9878c", "#d75d71", "#c8b0d2", "#b8c8a7"],
    clothes: ["浅粉", "奶油白", "燕麦色", "淡紫", "柔雾蓝"],
    hair: ["柔棕色", "奶茶棕", "暖栗棕"],
  },
  premium: {
    title: "高级通勤",
    keywords: ["利落", "质感", "稳重"],
    makeup: ["干净底妆", "眉眼聚焦", "玫瑰棕唇"],
    colors: ["#242121", "#ded7d0", "#9a7a64", "#8c3f45", "#46604d"],
    clothes: ["黑色", "燕麦", "灰蓝", "酒红", "橄榄绿"],
    hair: ["黑茶色", "冷茶棕", "深栗棕"],
  },
};

const scenarioText = {
  daily: "日常通勤",
  business: "商务成交",
  social: "社交约会",
  camera: "拍摄上镜",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const photoInput = $("#photoInput");
const previewImage = $("#previewImage");
const photoPreview = $("#photoPreview");
const emptyState = $("#emptyState");
const cardsViewport = $("#cardsViewport");
const statusText = $("#statusText");
const generateButton = $("#generateButton");
const downloadCurrentButton = $("#downloadCurrentButton");
const downloadAllButton = $("#downloadAllButton");

photoInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.photoDataUrl = await fileToDataUrl(file);
  previewImage.src = state.photoDataUrl;
  photoPreview.hidden = false;
  markResultsStale("照片已更新，请重新生成四套图卡。");
});

$("#clientName").addEventListener("input", () => markResultsStale());
$("#ageRange").addEventListener("change", () => markResultsStale());
$("#scenario").addEventListener("change", () => markResultsStale());

$$("input[name='styleType']").forEach((input) => {
  input.addEventListener("change", () => {
    updateStyleSelection();
    markResultsStale();
  });
});

function markResultsStale(message = "资料已更新，请重新生成四套图卡。") {
  if (!state.generated) {
    statusText.textContent = state.photoDataUrl ? "照片已载入，可以生成四套图卡。" : "请先上传照片并生成结果。";
    return;
  }
  state.generated = false;
  state.generatedSnapshot = null;
  downloadCurrentButton.disabled = true;
  downloadAllButton.disabled = true;
  statusText.textContent = message;
}

function markResultsGenerated() {
  state.generated = true;
  downloadCurrentButton.disabled = false;
  downloadAllButton.disabled = false;
  statusText.textContent = "已生成四套图卡，可切换预览或导出。";
}

$("#replacePhotoButton").addEventListener("click", () => photoInput.click());

generateButton.addEventListener("click", () => {
  if (!state.photoDataUrl) {
    statusText.textContent = "请先上传一张照片。";
    photoInput.click();
    return;
  }
  state.generatedSnapshot = createGenerationSnapshot();
  emptyState.hidden = true;
  cardsViewport.hidden = false;
  renderAllCards();
  markResultsGenerated();
});

downloadCurrentButton.addEventListener("click", () => exportCard(state.activeCard));
downloadAllButton.addEventListener("click", async () => {
  if (!state.generatedSnapshot) return;
  downloadCurrentButton.disabled = true;
  downloadAllButton.disabled = true;
  try {
    const keys = Object.keys(cardNames);
    for (let index = 0; index < keys.length; index += 1) {
      statusText.textContent = `正在导出第 ${index + 1}/4 张：${cardNames[keys[index]]}...`;
      await exportCard(keys[index], { preserveStatus: true });
      await delay(450);
    }
    statusText.textContent = "四张图卡已触发下载。";
  } finally {
    if (state.generatedSnapshot) {
      downloadCurrentButton.disabled = false;
      downloadAllButton.disabled = false;
    }
  }
});

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveCard(tab.dataset.card);
  });
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getInputData() {
  const styleKey = document.querySelector("input[name='styleType']:checked").value;
  return {
    name: $("#clientName").value.trim() || "形象客户",
    age: $("#ageRange").value,
    scenario: $("#scenario").value,
    styleKey,
    profile: profiles[styleKey],
  };
}

function createGenerationSnapshot() {
  return {
    ...getInputData(),
    photoDataUrl: state.photoDataUrl,
  };
}

function setActiveCard(cardKey) {
  state.activeCard = cardKey;
  $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.card === cardKey));
  $$(".result-card").forEach((card) => card.classList.toggle("is-active", card.dataset.card === cardKey));
}

function renderAllCards() {
  const data = state.generatedSnapshot;
  if (!data) return;
  $("#card-makeup").innerHTML = renderMakeupCard(data);
  $("#card-image").innerHTML = renderImageCard(data);
  $("#card-hair").innerHTML = renderHairCard(data);
  $("#card-outfit").innerHTML = renderOutfitCard(data);
  setActiveCard(state.activeCard);
  scaleCards();
}

function cardShell(title, subtitle, data, body) {
  const displayName = escapeHtml(data.name);
  return `
    <div class="analysis-card">
      <div class="card-inner">
        <header class="card-head">
          <div>
            <h2 class="card-title">${title}</h2>
            <p class="card-subtitle">${subtitle}</p>
          </div>
          <div class="keyword-box">
            <div>${displayName} 的风格关键词</div>
            <div class="keyword-pills">${data.profile.keywords.map((word) => `<span>${word}</span>`).join("")}</div>
          </div>
        </header>
        ${body}
        <footer class="analysis-footer">
          <span>AI形象风格参考｜${scenarioText[data.scenario]}｜${data.age}</span>
          <span>建议由顾问结合本人需求复核</span>
        </footer>
      </div>
    </div>
  `;
}

function renderMakeupCard(data) {
  const body = `
    <section class="hero-grid">
      <div class="portrait-frame large">
        <img src="${data.photoDataUrl}" alt="${escapeHtml(data.name)}照片" />
        <div class="callout-list">
          <span>眉眼间距</span>
          <span>鼻梁高低</span>
          <span>唇峰位置</span>
          <span>下颌线</span>
        </div>
      </div>
      <div class="panel">
        <h3 class="panel-title">五官分析</h3>
        <div class="feature-list">
          ${featureRow("眉毛", "自然生眉感，保留毛流，建议用浅棕色补空缺。", data.profile.colors.slice(0, 2))}
          ${featureRow("眼妆", "眼型偏清亮，适合放大卧蚕和根根分明睫毛。", data.profile.colors.slice(1, 4))}
          ${featureRow("鼻子", "鼻部保持轻修容，重点放在山根过渡和鼻头小面积提亮。", data.profile.colors.slice(2, 4))}
          ${featureRow("唇妆", "唇色以提气色为主，降低荧光感，选择豆沙或玫瑰色。", data.profile.colors.slice(2, 5))}
          ${featureRow("脸型", "脸部线条柔和，妆面重点是干净、提气色、保留个人辨识度。", data.profile.colors.slice(0, 1))}
        </div>
      </div>
    </section>
    <h3 class="section-title">局部妆容建议</h3>
    <section class="tile-grid">
      ${makeTile("眼妆", "自然放大双眼，眼尾轻拉，睫毛保持分明。")}
      ${makeTile("眉妆", "保留原生眉，眉尾略收，避免过粗过平。")}
      ${makeTile("底妆", "轻薄贴肤，重点修饰暗沉和肤色不均。")}
      ${makeTile("唇妆", "自然水光感，豆沙/玫瑰色提升气色。")}
    </section>
    <section class="two-column compact-section">
      <div>
        <h3 class="section-title">色彩推荐</h3>
        <div class="color-row">
          ${colorBlock("眼影色", data.profile.colors.slice(0, 4))}
          ${colorBlock("腮红色", data.profile.colors.slice(1, 5))}
          ${colorBlock("唇色推荐", data.profile.colors.slice(2, 5))}
        </div>
      </div>
      <div>
        <h3 class="section-title">产品参考</h3>
        <div class="product-row">
          ${["四色眼影", "奶杏腮红", "豆沙口红", "轻薄粉底", "定妆散粉"].map((item) => `<div class="product-item"><div class="product-box">${item.slice(0, 1)}</div><span>${item}</span></div>`).join("")}
        </div>
      </div>
    </section>
    <div class="tip-strip">小贴士：妆容重点是突出自身优势，保留个人特色，做微美的自己。</div>
  `;
  return cardShell("妆容分析指南", `自然清透 · 提升气色 · 柔和灵动`, data, body);
}

function renderImageCard(data) {
  const body = `
    <section class="hero-grid">
      <div class="portrait-frame medium">
        <img src="${data.photoDataUrl}" alt="${escapeHtml(data.name)}照片" />
      </div>
      <div class="panel">
        <h3 class="panel-title">形象定位</h3>
        <div class="advice-list">
          ${advice("风格", `${data.profile.title}，适合做干净耐看的第一印象。`)}
          ${advice("氛围", `${scenarioText[data.scenario]}场景下，建议强化亲和与可信度。`)}
          ${advice("色调", `${data.profile.clothes.slice(0, 3).join("、")}更能承托肤色和气质。`)}
          ${advice("适合场合", "约会、日常、通勤、聚会都可以按浓淡调整。")}
        </div>
      </div>
    </section>
    <section class="info-grid compact-section">
      <div class="panel">
        <h3 class="panel-title">妆容分析</h3>
        <div class="feature-list">
          ${featureRow("眉毛", "自然弧度，避免过硬。", data.profile.colors.slice(0, 2))}
          ${featureRow("眼妆", "清透放大，少量珠光。", data.profile.colors.slice(1, 3))}
          ${featureRow("鼻子", "山根轻修，鼻头少量提亮。", data.profile.colors.slice(2, 4))}
          ${featureRow("唇妆", "低饱和提气色。", data.profile.colors.slice(2, 5))}
        </div>
      </div>
      <div>
        <h3 class="section-title">色彩分析</h3>
        <div class="tile-grid">
          ${data.profile.clothes.slice(0, 4).map((name, index) => `<div class="tile"><div class="tile-image" style="background:${data.profile.colors[index]}"></div><div class="tile-body"><h4>${name}</h4><p>适合${scenarioText[data.scenario]}，降低用力感。</p></div></div>`).join("")}
        </div>
      </div>
    </section>
    <h3 class="section-title">珠宝配饰分析</h3>
    <section class="jewelry-row product-row">
      ${["珍珠耳钉", "细链项链", "水滴耳饰", "小巧吊坠", "细链手镯"].map((item) => `<div class="jewelry-item"><div class="jewelry-icon">◇</div><span>${item}</span></div>`).join("")}
    </section>
    <h3 class="section-title">整体风格建议</h3>
    <section class="two-column">
      <div class="panel">
        <div class="advice-list">
          ${advice("脸型定位", "适合自然修饰，不需要过度遮挡面部线条。")}
          ${advice("适合元素", "柔和色彩、轻量配饰、垂顺发丝、利落轮廓。")}
          ${advice("搭配重点", "妆发穿搭保持同一气质，不做强烈割裂。")}
        </div>
      </div>
      <div class="portrait-frame medium">
        <img src="${data.photoDataUrl}" alt="${escapeHtml(data.name)}形象参考" />
      </div>
    </section>
    <div class="tip-strip">小贴士：突出自身优势，选择适合自己的风格与色彩，做最美的自己。</div>
  `;
  return cardShell("个人形象分析图卡", `${data.profile.title} · 提气色 · 强化辨识度`, data, body);
}

function renderHairCard(data) {
  const body = `
    <section class="hero-grid">
      <div class="portrait-frame medium">
        <img src="${data.photoDataUrl}" alt="${escapeHtml(data.name)}照片" />
      </div>
      <div class="info-grid">
        <div class="panel">
          <h3 class="panel-title">脸型特征</h3>
          <div class="face-line">
            <div class="face-line-item">轮廓偏柔和</div>
            <div class="face-line-item">五官集中度适中</div>
            <div class="face-line-item">脸型线条流畅</div>
            <div class="face-line-item">发量适合做层次</div>
            <div class="face-line-item">发质建议保持光泽</div>
          </div>
        </div>
        <div class="panel">
          <h3 class="panel-title">提升重点</h3>
          <div class="advice-list">
            ${advice("1", "修饰额头和下颌线条")}
            ${advice("2", "增加发型层次与空气感")}
            ${advice("3", "柔化脸部轮廓")}
            ${advice("4", "提升整体气质")}
          </div>
        </div>
      </div>
    </section>
    <h3 class="section-title">发型推荐</h3>
    <section class="recommend-band">
      ${hairGroup("最适合", ["中长层次剪", "法式慵懒卷", "八字刘海"], ["修饰脸型，轻盈柔和", "增加氛围，温柔显脸小", "修饰额角，提升精致度"], data)}
      ${hairGroup("普通", ["齐肩直发", "空气刘海", "微卷中长发"], ["中规中矩，日常自然", "减龄但要避免厚重", "自然蓬松，不贴头皮"], data)}
      ${hairGroup("不建议", ["厚重齐刘海", "贴头直发", "超短齐耳发"], ["容易压低轻盈感", "需要更多蓬松支撑", "需要更强妆发支撑"], data)}
    </section>
    <section class="recommend-band compact-section">
      ${hairGroup("盘发可选", ["锁骨外翻发", "低马尾", "半扎发"], ["轻盈灵动，显年轻", "商务场景更利落", "自然随性"], data)}
      ${hairGroup("造型可选", ["高丸子头", "侧分直发", "高马尾"], ["清爽利落", "简单大方", "气场偏强"], data)}
      ${hairGroup("慎选造型", ["爆炸卷发", "羊毛卷", "全盘发"], ["容易压低清爽感", "风格辨识度较强", "成熟感会更明显"], data)}
    </section>
    <section class="two-column compact-section">
      <div class="panel">
        <h3 class="panel-title">发型小建议</h3>
        <div class="advice-list">
          ${advice("A", "保持发量蓬松，避免头顶贴塌。")}
          ${advice("B", "适当层次修剪，让发型更轻盈。")}
          ${advice("C", "刘海修饰脸型，优先八字或侧分。")}
          ${advice("D", "定期护理，保持发质光泽。")}
        </div>
      </div>
      <div class="panel">
        <h3 class="panel-title">推荐发色</h3>
        <div class="advice-list">
          ${data.profile.hair.map((color, index) => `<div class="advice-item"><span class="swatch" style="background:${["#202525", "#704b36", "#5c3329"][index]}"></span><div><h4>${color}</h4><p>自然显白，适合${scenarioText[data.scenario]}。</p></div></div>`).join("")}
        </div>
      </div>
    </section>
    <div class="tip-strip">小贴士：发型核心是修饰脸型、提升气质、适配自己的生活方式。</div>
  `;
  return cardShell("个人发型分析", "根据脸型、气质与发质，打造最修饰你的发型", data, body);
}

function renderOutfitCard(data) {
  const left = data.styleKey === "cool" ? "清冷简约风格" : "清透自然风格";
  const right = data.styleKey === "sweet" ? "甜美自然风格" : "温柔通勤风格";
  const body = `
    <section class="style-compare">
      ${styleColumn(left, "COOL & MINIMAL STYLE", "线条利落<br>气质清爽高级", ["黑色吊带", "白衬衫", "西装套装", "针织半身裙", "黑色连衣裙"], data)}
      ${styleColumn(right, "SWEET & NATURAL STYLE", "自然温柔<br>亲和灵动", ["针织开衫", "碎花裙", "浅色牛仔", "白色短裙", "柔软套装"], data)}
    </section>
    <section class="style-compare compact-section">
      <div class="style-column">
        <div class="style-body">
          <h3 class="section-title">清冷简约配色推荐</h3>
          ${outfitColors(["黑色", "白色", "冷灰", "深棕", "酒红"], ["#080808", "#ffffff", "#a7a5a6", "#583329", "#8c3039"])}
          <h3 class="section-title">清冷简约配饰推荐</h3>
          <div class="product-row">${["极简耳钉", "细链项链", "金属手镯", "腕表", "腋下包"].map((item) => `<div class="jewelry-item"><div class="jewelry-icon">□</div><span>${item}</span></div>`).join("")}</div>
          <h3 class="section-title">适合场合</h3>
          <div class="outfit-row">${["商务上班", "约会会谈", "线下见客", "朋友聚会", "日常出行"].map((item) => outfitItem(item, data)).join("")}</div>
          ${styleSummary(data, "清冷简约风格总结", ["风格关键词：简洁、线条、高级、干净", "适合元素：利落剪裁、低饱和色、轻量配饰", "避雷重点：避免过多蕾丝、复杂花纹、廉价亮片"])}
        </div>
      </div>
      <div class="style-column">
        <div class="style-body">
          <h3 class="section-title">甜美自然配色推荐</h3>
          ${outfitColors(data.profile.clothes, data.profile.colors)}
          <h3 class="section-title">甜美自然配饰推荐</h3>
          <div class="product-row">${["珍珠耳钉", "锁骨链", "细戒指", "小方表", "浅色包"].map((item) => `<div class="jewelry-item"><div class="jewelry-icon">○</div><span>${item}</span></div>`).join("")}</div>
          <h3 class="section-title">适合场合</h3>
          <div class="outfit-row">${["日常休闲", "约会逛街", "下午茶", "私域拍摄", "轻熟聚会"].map((item) => outfitItem(item, data)).join("")}</div>
          ${styleSummary(data, "甜美自然风格总结", ["风格关键词：自然、温柔、清新、亲和", "适合元素：柔软面料、浅色系、小量配饰", "避雷重点：避免过度甜腻、整套幼态、颜色太满"])}
        </div>
      </div>
    </section>
    <div class="tip-strip">小贴士：穿搭不是换一个人，而是用合适的线条、颜色和场景，让你的优势更明显。</div>
  `;
  return cardShell("个人穿搭分析", "找到更适合自己的风格", data, body);
}

function featureRow(title, text, colors, photoDataUrl = state.generatedSnapshot?.photoDataUrl || state.photoDataUrl) {
  return `
    <div class="feature-row">
      <div class="thumbnail"><img src="${photoDataUrl}" alt="" /></div>
      <div>
        <h4>${title}</h4>
        <p>${text}</p>
      </div>
      <div class="swatches">${colors.map((color) => `<span class="swatch" style="background:${color}"></span>`).join("")}</div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeTile(title, text) {
  return `
    <div class="tile">
      <div class="tile-image"></div>
      <div class="tile-body">
        <h4>${title}</h4>
        <p>${text}</p>
      </div>
    </div>
  `;
}

function colorBlock(title, colors) {
  return `
    <div class="color-block">
      <h4>${title}</h4>
      <div class="swatch-row">${colors.map((color) => `<span class="swatch" style="background:${color}"></span>`).join("")}</div>
    </div>
  `;
}

function advice(icon, text) {
  return `
    <div class="advice-item">
      <span class="advice-icon">${icon}</span>
      <div>
        <h4>${text.split("，")[0]}</h4>
        <p>${text}</p>
      </div>
    </div>
  `;
}

function hairGroup(title, names, captions, data) {
  return `
    <div class="recommend-group">
      <h3>${title}</h3>
      <div class="hair-row">
        ${names.map((name, index) => `<div class="hair-item"><div class="hair-photo"><img src="${data.photoDataUrl}" alt="" /></div><span>${name}</span><p>${captions[index]}</p></div>`).join("")}
      </div>
    </div>
  `;
}

function styleColumn(title, enTitle, note, items, data) {
  return `
    <div class="style-column">
      <div class="style-head">
        <h2>${title}</h2>
        <p>${enTitle}</p>
      </div>
      <div class="style-main portrait-frame">
        <img src="${data.photoDataUrl}" alt="${title}" />
        <div class="style-note">${note}</div>
      </div>
      <div class="style-body">
        <p class="caption">风格特点：配色克制、线条清晰、整体干净，适合${scenarioText[data.scenario]}。</p>
        <h3 class="section-title">${title.replace("风格", "")}穿搭示例</h3>
        <div class="outfit-row">${items.map((item) => outfitItem(item, data)).join("")}</div>
      </div>
    </div>
  `;
}

function outfitItem(item, data) {
  return `
    <div class="outfit-item">
      <div class="outfit-photo"><img src="${data.photoDataUrl}" alt="" /></div>
      <span>${item}</span>
    </div>
  `;
}

function outfitColors(names, colors) {
  return `
    <div class="color-row">
      ${names.slice(0, 3).map((name, index) => `<div class="color-block"><h4>${name}</h4><div class="swatch-row"><span class="swatch" style="background:${colors[index]}"></span><span class="swatch" style="background:${colors[index + 1] || colors[0]}"></span></div></div>`).join("")}
    </div>
  `;
}

function styleSummary(data, title, items) {
  return `
    <div class="style-summary">
      <div class="portrait-frame"><img src="${data.photoDataUrl}" alt="" /></div>
      <div>
        <h4>${title}</h4>
        <ul class="summary-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

async function exportCard(cardKey, options = {}) {
  const snapshot = state.generatedSnapshot;
  if (!snapshot) {
    statusText.textContent = "请先重新生成图卡，再导出。";
    return;
  }

  const oldText = statusText.textContent;
  if (!options.preserveStatus) {
    statusText.textContent = `正在导出「${cardNames[cardKey]}」...`;
  }

  try {
    const canvas = await drawExportCanvas(cardKey, snapshot);
    const link = document.createElement("a");
    const safeName = snapshot.name.replace(/[\\/:*?"<>|]/g, "");
    link.download = `${safeName}_${cardNames[cardKey]}_${formatDate()}.png`;
    const blob = await canvasToBlob(canvas);
    link.href = URL.createObjectURL(blob);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    if (!options.preserveStatus) {
      statusText.textContent = oldText;
    }
  } catch (error) {
    console.error(error);
    statusText.textContent = "导出失败，请刷新后重试。";
  }
}

async function drawExportCanvas(cardKey, data) {
  const heights = { makeup: 1920, image: 2060, hair: 1920, outfit: 2200 };
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = heights[cardKey] || 1920;
  const ctx = canvas.getContext("2d");
  const photo = await loadImage(data.photoDataUrl);

  ctx.fillStyle = "#fffdfc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawHeader(ctx, data, cardNames[cardKey], cardKey);

  if (cardKey === "makeup") drawMakeupExport(ctx, data, photo);
  if (cardKey === "image") drawImageExport(ctx, data, photo);
  if (cardKey === "hair") drawHairExport(ctx, data, photo);
  if (cardKey === "outfit") drawOutfitExport(ctx, data, photo);

  drawFooter(ctx, data, canvas.height);
  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG 导出失败"));
      }
    }, "image/png");
  });
}

function drawHeader(ctx, data, title, cardKey) {
  const subtitles = {
    makeup: "自然清透 · 提升气色 · 柔和灵动",
    image: `${data.profile.title} · 提气色 · 强化辨识度`,
    hair: "根据脸型、气质与发质，打造最修饰你的发型",
    outfit: "找到更适合自己的风格",
  };

  ctx.fillStyle = "#241b19";
  ctx.font = '700 48px "Songti SC", "SimSun", serif';
  ctx.fillText(title, 42, 76);
  ctx.fillStyle = "#6e605c";
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(subtitles[cardKey], 42, 116);

  ctx.textAlign = "right";
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = "#6c5f5b";
  ctx.fillText(`${data.name} 的风格关键词`, 1038, 68);
  let x = 1038;
  data.profile.keywords
    .slice()
    .reverse()
    .forEach((word) => {
      const w = ctx.measureText(word).width + 34;
      x -= w;
      roundRect(ctx, x, 88, w, 34, 17, "#f5ebe7", null);
      ctx.fillStyle = "#6b504b";
      ctx.font = '700 18px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(word, x + w / 2, 111);
      x -= 8;
    });
  ctx.textAlign = "left";
}

function drawMakeupExport(ctx, data, photo) {
  drawImageCover(ctx, photo, 42, 150, 530, 650, 8);
  drawPhotoCallouts(ctx, ["眉眼间距", "鼻梁高低", "唇峰位置", "下颌线"], 430, 245);
  drawPanel(ctx, 604, 150, 434, 650, "五官分析");
  const rows = [
    ["眉毛", "自然生眉感，保留毛流，建议用浅棕色补空缺。"],
    ["眼妆", "眼型偏清亮，适合放大卧蚕和根根分明睫毛。"],
    ["鼻子", "鼻部轻修容，重点放在山根过渡和鼻头提亮。"],
    ["唇妆", "唇色以提气色为主，选择豆沙或玫瑰色。"],
    ["脸型", "妆面重点是干净、提气色、保留个人辨识度。"],
  ];
  rows.forEach((row, index) => {
    const y = 225 + index * 108;
    drawImageCover(ctx, photo, 630, y - 34, 72, 82, 6);
    drawTextBlock(ctx, row[0], row[1], 720, y, 210);
    drawSwatches(ctx, data.profile.colors.slice(index % 3, index % 3 + 2), 960, y - 16, 24);
  });

  drawSectionTitle(ctx, "局部妆容建议", 42, 850, 996);
  drawMiniTiles(ctx, ["眼妆", "眉妆", "底妆", "唇妆"], 42, 920, data.profile.colors);
  drawSectionTitle(ctx, "色彩推荐", 42, 1195, 480);
  drawColorBlocks(ctx, ["眼影色", "腮红色", "唇色推荐"], data.profile.colors, 42, 1265, 480);
  drawSectionTitle(ctx, "产品参考", 558, 1195, 480);
  drawProducts(ctx, ["四色眼影", "奶杏腮红", "豆沙口红", "轻薄粉底", "定妆散粉"], 558, 1265);
  drawTip(ctx, "妆容重点是突出自身优势，保留个人特色，做微美的自己。", 42, 1748);
}

function drawImageExport(ctx, data, photo) {
  drawImageCover(ctx, photo, 42, 150, 470, 520, 8);
  drawPanel(ctx, 542, 150, 496, 520, "形象定位");
  const adviceItems = [
    ["风格", `${data.profile.title}，适合做干净耐看的第一印象。`],
    ["氛围", `${scenarioText[data.scenario]}场景下，强化亲和与可信度。`],
    ["色调", `${data.profile.clothes.slice(0, 3).join("、")}更能承托肤色。`],
    ["场合", "约会、日常、通勤、聚会都可以按浓淡调整。"],
  ];
  adviceItems.forEach((item, index) => drawAdviceLine(ctx, item[0], item[1], 575, 240 + index * 88, 410));

  drawSectionTitle(ctx, "妆容分析", 42, 720, 480);
  rowsToPanel(ctx, ["眉毛", "眼妆", "鼻子", "唇妆"], 42, 790, 480, photo, data.profile.colors);
  drawSectionTitle(ctx, "色彩分析", 558, 720, 480);
  drawColorCards(ctx, data.profile.clothes.slice(0, 6), data.profile.colors, 558, 790);
  drawSectionTitle(ctx, "珠宝配饰分析", 42, 1188, 996);
  drawProducts(ctx, ["珍珠耳钉", "细链项链", "水滴耳饰", "小巧吊坠", "细链手镯"], 42, 1260);
  drawSectionTitle(ctx, "整体风格建议", 42, 1445, 996);
  drawPanel(ctx, 42, 1520, 480, 310, "建议重点");
  ["自然修饰，不需要过度遮挡面部线条。", "柔和色彩、轻量配饰、垂顺发丝。", "妆发穿搭保持同一气质，不做强烈割裂。"].forEach((text, index) => drawAdviceLine(ctx, String(index + 1), text, 72, 1595 + index * 72, 400));
  drawImageCover(ctx, photo, 558, 1520, 480, 310, 8);
  drawTip(ctx, "突出自身优势，选择适合自己的风格与色彩，做最美的自己。", 42, 1900);
}

function drawHairExport(ctx, data, photo) {
  drawImageCover(ctx, photo, 42, 150, 470, 500, 8);
  drawPanel(ctx, 542, 150, 230, 500, "脸型特征");
  ["轮廓偏柔和", "五官集中适中", "脸型线条流畅", "适合做层次", "保持发质光泽"].forEach((text, index) => drawCheck(ctx, text, 570, 230 + index * 72));
  drawPanel(ctx, 802, 150, 236, 500, "提升重点");
  ["修饰额头和下颌", "增加层次空气感", "柔化脸部轮廓", "提升整体气质"].forEach((text, index) => drawAdviceLine(ctx, String(index + 1), text, 825, 238 + index * 82, 170));

  drawSectionTitle(ctx, "发型推荐", 42, 700, 996);
  const groups = [
    ["最适合", ["中长层次剪", "法式慵懒卷", "八字刘海"]],
    ["普通", ["齐肩直发", "空气刘海", "微卷中长发"]],
    ["不建议", ["厚重齐刘海", "贴头直发", "超短齐耳发"]],
    ["盘发可选", ["锁骨外翻发", "低马尾", "半扎发"]],
    ["造型可选", ["高丸子头", "侧分直发", "高马尾"]],
    ["慎选造型", ["爆炸卷发", "羊毛卷", "全盘发"]],
  ];
  groups.forEach((group, index) => {
    const x = 42 + (index % 3) * 340;
    const y = 775 + Math.floor(index / 3) * 360;
    drawHairGroup(ctx, group[0], group[1], x, y, photo);
  });
  drawSectionTitle(ctx, "发型小建议", 42, 1545, 620);
  ["保持发量蓬松，避免头顶贴塌。", "适当层次修剪，让发型更轻盈。", "刘海优先八字或侧分。", "定期护理，保持发质光泽。"].forEach((text, index) => drawAdviceLine(ctx, String.fromCharCode(65 + index), text, 70, 1625 + index * 58, 560));
  drawSectionTitle(ctx, "推荐发色", 706, 1545, 332);
  data.profile.hair.forEach((name, index) => {
    drawSwatches(ctx, [["#202525"], ["#704b36"], ["#5c3329"]][index], 740, 1625 + index * 70, 34);
    drawText(ctx, name, 792, 1648 + index * 70, 22, 700, "#241b19");
  });
  drawTip(ctx, "发型核心是修饰脸型、提升气质、适配自己的生活方式。", 42, 1810);
}

function drawOutfitExport(ctx, data, photo) {
  drawStyleColumn(ctx, data, "清冷简约风格", "COOL & MINIMAL STYLE", "线条利落\n气质清爽高级", 42, 150, 498, photo, ["黑色吊带", "白衬衫", "西装套装", "针织半身裙", "黑色连衣裙"]);
  drawStyleColumn(ctx, data, "甜美自然风格", "SWEET & NATURAL STYLE", "自然温柔\n亲和灵动", 540, 150, 498, photo, ["针织开衫", "碎花裙", "浅色牛仔", "白色短裙", "柔软套装"]);
  drawSectionTitle(ctx, "清冷简约配色推荐", 42, 950, 480);
  drawColorBlocks(ctx, ["黑色", "白色", "冷灰"], ["#080808", "#ffffff", "#a7a5a6", "#583329"], 42, 1020, 480);
  drawSectionTitle(ctx, "甜美自然配色推荐", 558, 950, 480);
  drawColorBlocks(ctx, data.profile.clothes.slice(0, 3), data.profile.colors, 558, 1020, 480);
  drawSectionTitle(ctx, "清冷简约配饰推荐", 42, 1230, 480);
  drawProducts(ctx, ["极简耳钉", "细链项链", "腕表", "腋下包"], 42, 1300);
  drawSectionTitle(ctx, "甜美自然配饰推荐", 558, 1230, 480);
  drawProducts(ctx, ["珍珠耳钉", "锁骨链", "小方表", "浅色包"], 558, 1300);
  drawSectionTitle(ctx, "适合场合", 42, 1545, 996);
  drawMiniTiles(ctx, ["商务上班", "约会会谈", "日常休闲", "下午茶"], 42, 1615, data.profile.colors);
  drawPanel(ctx, 42, 1870, 480, 210, "清冷简约风格总结");
  ["简洁、线条、高级、干净", "利落剪裁、低饱和色、轻量配饰", "避免复杂花纹和廉价亮片"].forEach((text, index) => drawCheck(ctx, text, 70, 1940 + index * 44));
  drawPanel(ctx, 558, 1870, 480, 210, "甜美自然风格总结");
  ["自然、温柔、清新、亲和", "柔软面料、浅色系、小量配饰", "避免过度甜腻和颜色太满"].forEach((text, index) => drawCheck(ctx, text, 586, 1940 + index * 44));
}

function drawFooter(ctx, data, height) {
  ctx.fillStyle = "#998b87";
  ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`AI形象风格参考｜${scenarioText[data.scenario]}｜${data.age}`, 42, height - 38);
  ctx.textAlign = "right";
  ctx.fillText("建议由顾问结合本人需求复核", 1038, height - 38);
  ctx.textAlign = "left";
}

function drawPanel(ctx, x, y, w, h, title) {
  roundRect(ctx, x, y, w, h, 8, "#ffffff", "#efe4e0");
  roundRect(ctx, x, y, w, 54, 8, "#fbf1ee", null);
  ctx.fillStyle = "#241b19";
  ctx.font = '700 26px "Songti SC", "SimSun", serif';
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 36);
  ctx.textAlign = "left";
}

function drawSectionTitle(ctx, title, x, y, w) {
  roundRect(ctx, x, y, w, 50, 0, "#fbf1ee", null);
  ctx.fillStyle = "#241b19";
  ctx.font = '700 28px "Songti SC", "SimSun", serif';
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 34);
  ctx.textAlign = "left";
}

function drawImageCover(ctx, image, x, y, w, h, radius) {
  ctx.save();
  roundedClip(ctx, x, y, w, h, radius);
  const imageRatio = image.width / image.height;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (imageRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawPhotoCallouts(ctx, labels, x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.font = '700 20px "PingFang SC", "Microsoft YaHei", sans-serif';
  labels.forEach((label, index) => {
    const yy = y + index * 92;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x - 95, yy - 7);
    ctx.lineTo(x - 10, yy - 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(label, x, yy);
  });
}

function drawTextBlock(ctx, title, text, x, y, maxWidth) {
  drawText(ctx, title, x, y, 22, 700, "#241b19");
  wrapText(ctx, text, x, y + 28, maxWidth, 18, 26, "#675b57");
}

function drawText(ctx, text, x, y, size, weight = 400, color = "#241b19") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText(text, x, y);
}

function wrapText(ctx, text, x, y, maxWidth, size, lineHeight, color = "#675b57", weight = 400) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  let line = "";
  let yy = y;
  for (const char of text) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = char;
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawSwatches(ctx, colors, x, y, size = 28) {
  colors.forEach((color, index) => {
    ctx.beginPath();
    ctx.arc(x + index * (size + 8) + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.stroke();
  });
}

function drawMiniTiles(ctx, names, x, y, colors) {
  const gap = 14;
  const w = (996 - gap * 3) / 4;
  names.forEach((name, index) => {
    const xx = x + index * (w + gap);
    roundRect(ctx, xx, y, w, 220, 8, "#ffffff", "#efe4e0");
    roundRect(ctx, xx, y, w, 94, 8, colors[index % colors.length], null);
    drawText(ctx, name, xx + 18, y + 140, 22, 700);
    wrapText(ctx, "线条干净，降低用力感，适合日常和私域展示。", xx + 18, y + 170, w - 36, 16, 23);
  });
}

function drawColorBlocks(ctx, names, colors, x, y, totalW) {
  const gap = 12;
  const w = (totalW - gap * (names.length - 1)) / names.length;
  names.forEach((name, index) => {
    const xx = x + index * (w + gap);
    roundRect(ctx, xx, y, w, 116, 8, "#ffffff", "#efe4e0");
    drawText(ctx, name, xx + 18, y + 36, 20, 700);
    drawSwatches(ctx, colors.slice(index, index + 3), xx + 18, y + 58, 28);
  });
}

function drawProducts(ctx, names, x, y) {
  const gap = 12;
  const totalW = x > 100 ? 480 : 996;
  const w = (totalW - gap * (names.length - 1)) / names.length;
  names.forEach((name, index) => {
    const xx = x + index * (w + gap);
    roundRect(ctx, xx, y, w, 112, 8, "#ffffff", "#efe4e0");
    drawText(ctx, name.slice(0, 1), xx + w / 2 - 10, y + 65, 30, 700, "#86615b");
    ctx.textAlign = "center";
    drawText(ctx, name, xx + w / 2, y + 148, 15, 700, "#544945");
    ctx.textAlign = "left";
  });
}

function drawAdviceLine(ctx, icon, text, x, y, maxWidth) {
  ctx.beginPath();
  ctx.arc(x + 15, y - 7, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#c97872";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = '700 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(icon, x + 15, y - 1);
  ctx.textAlign = "left";
  wrapText(ctx, text, x + 44, y, maxWidth, 18, 26, "#675b57", 500);
}

function drawCheck(ctx, text, x, y) {
  ctx.beginPath();
  ctx.arc(x + 12, y - 8, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#e7eee2";
  ctx.fill();
  drawText(ctx, "✓", x + 5, y - 2, 15, 900, "#66775b");
  drawText(ctx, text, x + 34, y, 18, 500, "#4e4441");
}

function rowsToPanel(ctx, names, x, y, w, photo, colors) {
  roundRect(ctx, x, y, w, 350, 8, "#ffffff", "#efe4e0");
  names.forEach((name, index) => {
    const yy = y + 30 + index * 78;
    drawImageCover(ctx, photo, x + 18, yy - 18, 58, 58, 6);
    drawText(ctx, name, x + 92, yy + 2, 19, 700);
    wrapText(ctx, "自然修饰，强调干净耐看。", x + 92, yy + 28, 240, 15, 21);
    drawSwatches(ctx, colors.slice(index, index + 2), x + w - 85, yy - 10, 20);
  });
}

function drawColorCards(ctx, names, colors, x, y) {
  const gap = 12;
  const w = (480 - gap * 2) / 3;
  names.forEach((name, index) => {
    const xx = x + (index % 3) * (w + gap);
    const yy = y + Math.floor(index / 3) * 180;
    roundRect(ctx, xx, yy, w, 160, 8, "#ffffff", "#efe4e0");
    roundRect(ctx, xx, yy, w, 90, 8, colors[index % colors.length], null);
    ctx.textAlign = "center";
    drawText(ctx, name, xx + w / 2, yy + 128, 18, 700);
    ctx.textAlign = "left";
  });
}

function drawHairGroup(ctx, title, names, x, y, photo) {
  roundRect(ctx, x, y, 314, 315, 8, "#ffffff", "#efe4e0");
  roundRect(ctx, x, y, 314, 48, 8, "#f3ebe6", null);
  ctx.textAlign = "center";
  drawText(ctx, title, x + 157, y + 32, 22, 700);
  ctx.textAlign = "left";
  names.forEach((name, index) => {
    const xx = x + 14 + index * 98;
    drawImageCover(ctx, photo, xx, y + 68, 88, 122, 6);
    ctx.textAlign = "center";
    drawText(ctx, name, xx + 44, y + 220, 15, 700);
    wrapText(ctx, "修饰脸型", xx + 8, y + 248, 74, 13, 18, "#756966");
    ctx.textAlign = "left";
  });
}

function drawStyleColumn(ctx, data, title, enTitle, note, x, y, w, photo, outfits) {
  roundRect(ctx, x, y, w, 760, 8, "#ffffff", "#efe4e0");
  roundRect(ctx, x, y, w, 72, 8, title.includes("清冷") ? "#bd7771" : "#a3a8bb", null);
  ctx.textAlign = "center";
  drawText(ctx, title, x + w / 2, y + 42, 30, 700, "#ffffff");
  drawText(ctx, enTitle, x + w / 2, y + 62, 13, 500, "#ffffff");
  ctx.textAlign = "left";
  drawImageCover(ctx, photo, x, y + 72, w, 330, 0);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 24px "Songti SC", "SimSun", serif';
  note.split("\n").forEach((line, index) => ctx.fillText(line, x + w - 150, y + 210 + index * 36));
  wrapText(ctx, `风格特点：配色克制、线条清晰、整体干净，适合${scenarioText[data.scenario]}。`, x + 20, y + 438, w - 40, 18, 28);
  drawText(ctx, `${title.replace("风格", "")}穿搭示例`, x + 20, y + 510, 24, 700);
  const itemW = (w - 40 - 4 * 8) / 5;
  outfits.forEach((item, index) => {
    const xx = x + 20 + index * (itemW + 8);
    drawImageCover(ctx, photo, xx, y + 535, itemW, 128, 6);
    ctx.textAlign = "center";
    drawText(ctx, item, xx + itemW / 2, y + 696, 13, 700);
    ctx.textAlign = "left";
  });
}

function drawTip(ctx, text, x, y) {
  roundRect(ctx, x, y, 996, 56, 8, "#fbf1ee", null);
  drawText(ctx, "小贴士：", x + 20, y + 36, 18, 700, "#6f5f5b");
  drawText(ctx, text, x + 100, y + 36, 18, 500, "#6f5f5b");
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function roundedClip(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
}

function formatDate() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scaleCards() {
  const viewport = cardsViewport.getBoundingClientRect().width;
  const scale = Math.min(1, Math.max(0.24, (viewport - 20) / 1080));
  $$(".result-card").forEach((wrapper) => {
    const card = wrapper.querySelector(".analysis-card");
    if (!card) return;
    card.style.transform = `scale(${scale})`;
    card.style.marginBottom = "0";
    wrapper.style.width = `${Math.round(1080 * scale)}px`;
    wrapper.style.height = `${Math.round(card.offsetHeight * scale)}px`;
  });
}

window.addEventListener("resize", () => {
  if (state.generated) scaleCards();
});

if (new URLSearchParams(window.location.search).get("demo") === "1") {
  window.addEventListener("load", () => {
    state.photoDataUrl = createDemoPortrait();
    previewImage.src = state.photoDataUrl;
    photoPreview.hidden = false;
    $("#clientName").value = "测试客户";
    document.querySelector('input[name="styleType"][value="cool"]').checked = true;
    updateStyleSelection();
    state.generatedSnapshot = createGenerationSnapshot();
    emptyState.hidden = true;
    cardsViewport.hidden = false;
    renderAllCards();
    markResultsGenerated();
  });
}

function updateStyleSelection() {
  $$("input[name='styleType']").forEach((input) => {
    input.closest("label").classList.toggle("is-selected", input.checked);
  });
}

function createDemoPortrait() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <rect width="900" height="1200" fill="#2b2024"/>
      <ellipse cx="450" cy="520" rx="230" ry="300" fill="#efc6b5"/>
      <path d="M230 480c30-250 410-270 455 5 0-270-455-315-455-5Z" fill="#171719"/>
      <circle cx="370" cy="520" r="22" fill="#171719"/>
      <circle cx="530" cy="520" r="22" fill="#171719"/>
      <path d="M345 455c45-22 80-15 105 0M505 455c45-18 82-12 112 7" stroke="#171719" stroke-width="14" stroke-linecap="round"/>
      <path d="M450 560c-25 60-18 93 20 105" stroke="#c98275" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M365 730c60 42 120 44 180 0" stroke="#b64757" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M230 700c-60 150-95 315-145 500h730c-55-200-95-355-150-500-120 110-315 110-435 0Z" fill="#111111"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
