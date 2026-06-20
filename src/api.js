export function getCsrfToken(cookieText = globalThis.document?.cookie || "") {
  const match = String(cookieText).match(/(?:^|;\s*)bili_jct=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export class ApiClient {
  constructor({
    fetchImpl = globalThis.fetch?.bind(globalThis),
    csrfProvider = () => getCsrfToken(),
    now = () => Date.now(),
    timeoutMs = 10000,
  } = {}) {
    this.fetchImpl = fetchImpl;
    this.csrfProvider = csrfProvider;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.inFlight = new Map();
    this.lastRequestAt = new Map();
    this.cache = new Map();
  }

  async fetchJson(key, url, options = {}) {
    if (!this.fetchImpl) throw new Error("fetch is not available");
    if (this.inFlight.has(key)) return this.inFlight.get(key);

    const controller = typeof AbortController !== "undefined" && !options.signal ? new AbortController() : null;
    const requestOptions = controller ? { ...options, signal: controller.signal } : options;
    let timeoutId = 0;

    const request = this.fetchImpl(url, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText || ""}`.trim());
        }
        return response.json();
      });
    request.catch(() => {});

    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        if (controller) controller.abort();
        reject(new Error("请求超时"));
      }, this.timeoutMs);
    });

    const promise = Promise.race([request, timeout])
      .finally(() => {
        clearTimeout(timeoutId);
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  canRequest(key, minIntervalMs = 3000) {
    const last = this.lastRequestAt.get(key) || 0;
    const current = this.now();
    if (current - last < minIntervalMs) return false;
    this.lastRequestAt.set(key, current);
    return true;
  }

  async getVideoInfo(bv) {
    if (!bv) return null;
    const cacheKey = `video:${bv}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    if (!this.canRequest(cacheKey)) return null;

    const json = await this.fetchJson(
      cacheKey,
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bv)}`,
      {
        credentials: "include",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      },
    );

    if (json.code !== 0 || !json.data) throw new Error(json.message || "Video API failed");
    const data = json.data;
    const info = {
      bv,
      aid: data.aid,
      title: data.title || "",
      upName: data.owner?.name || "",
      upUid: data.owner?.mid ? String(data.owner.mid) : "",
      favorite: Number(data.stat?.favorite || 0),
      pubdate: Number(data.pubdate || 0),
      duration: Number(data.duration || 0),
      partition: data.tname || "",
      view: Number(data.stat?.view || 0),
      like: Number(data.stat?.like || 0),
      coin: Number(data.stat?.coin || 0),
      chargingExclusive: Boolean(data.is_upower_exclusive),
      width: Number(data.dimension?.width || 0),
      height: Number(data.dimension?.height || 0),
    };
    info.likesRate = info.view ? Number(((info.like / info.view) * 100).toFixed(2)) : 0;
    info.coinRate = info.view ? Number(((info.coin / info.view) * 100).toFixed(2)) : 0;
    info.favoriteCoinRatio = info.coin ? Number((info.favorite / info.coin).toFixed(2)) : 0;

    this.cache.set(cacheKey, info);
    return info;
  }

  async getTags(bv) {
    if (!bv) return [];
    const cacheKey = `tags:${bv}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    if (!this.canRequest(cacheKey)) return [];

    const json = await this.fetchJson(
      cacheKey,
      `https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${encodeURIComponent(bv)}`,
      { credentials: "include" },
    );
    const source = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.tags) ? json.data.tags : [];
    const tags = source
      .map((tag) => String(tag.tag_name || tag).trim())
      .filter(Boolean);

    this.cache.set(cacheKey, tags);
    return tags;
  }

  async getUpInfo(uid) {
    if (!uid) return null;
    const cacheKey = `up:${uid}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.now() - cached.updatedAt < 3600000) return cached;
    if (!this.canRequest(cacheKey)) return null;

    const json = await this.fetchJson(
      cacheKey,
      `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(uid)}`,
      { credentials: "include" },
    );
    if (json.code !== 0 || !json.data?.card) throw new Error(json.message || "UP API failed");
    const card = json.data.card;
    const upInfo = {
      uid: String(uid),
      name: card.name || "",
      level: Number(card.level_info?.current_level || 0),
      fans: Number(card.fans || 0),
      attention: Number(card.attention || 0),
      sign: card.sign || "",
      updatedAt: this.now(),
    };
    this.cache.set(cacheKey, upInfo);
    return upInfo;
  }

  async getComments(aid) {
    if (!aid) return null;
    const cacheKey = `comments:${aid}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    if (!this.canRequest(cacheKey, 5000)) return null;

    const params = new URLSearchParams({
      type: "1",
      oid: String(aid),
      sort: "0",
      ps: "1",
      pn: "1",
      nohot: "0",
    });
    const json = await this.fetchJson(
      cacheKey,
      `https://api.bilibili.com/x/v2/reply?${params.toString()}`,
      { credentials: "include" },
    );
    const comments = {
      filteredComments: Boolean(json.data?.control?.web_selection),
      topComment: json.data?.upper?.top?.content?.message || "",
    };
    this.cache.set(cacheKey, comments);
    return comments;
  }

  async dislikeVideo({ aid, bv, reason = 1 }) {
    const csrf = this.csrfProvider();
    if (!csrf) throw new Error("缺少 csrf");
    const id = aid || bv;
    if (!id) throw new Error("缺少视频 ID");
    return this.postForm("https://api.bilibili.com/x/feed/dislike", {
      id,
      type: aid ? "av" : "bv",
      reason,
      csrf,
    });
  }

  async blockUp(uid) {
    const csrf = this.csrfProvider();
    if (!csrf) throw new Error("缺少 csrf");
    if (!uid) throw new Error("缺少 UP UID");
    return this.postForm("https://api.bilibili.com/x/relation/modify", {
      fid: uid,
      act: 5,
      re_src: 11,
      csrf,
    });
  }

  async postForm(url, payload) {
    const json = await this.fetchJson(`post:${url}:${JSON.stringify(payload)}:${this.now()}`, url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload),
    });
    if (json.code !== 0) throw new Error(json.message || "接口调用失败");
    return json;
  }
}
