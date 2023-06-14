/*
用法：Sub-Store脚本操作里添加：默认48H缓存超时
日期：2023-06-12 18:04:49 仅支持Surge、Loon; 其他不支持置顶节点请使用rename
符号：🅳电信 🅻联通 🆈移动 🅶广电 🅲公司 🆉直连 🎮游戏
作者：@Key @奶茶姐 @小一 @可莉
接口：入口查询[国内spapi 识别到国外为ip-api] 落地查询[ip-api]
注意：必须安装以下模块，关闭官方版本才能使用: 目前SubStore还未更新脚本持久化缓存超时
 * Surge: https://github.com/Keywos/rule/raw/main/Sub-Store/Sub-Store.sgmodule
 * Loon: https://github.com/Keywos/rule/raw/main/Sub-Store/Sub-Store.plugin
 * 可莉版本 Loon: https://gitlab.com/lodepuly/vpn_tool/-/raw/main/Tool/Loon/Plugin/Sub-Store.plugin
功能：根据接口返回的真实结果，重新对节点命名。添加入口城市、落地国家或地区、国内运营商信息，并对这些数据做持久化缓存（48小时有效期），减少API请求次数，提高运行效率。
[bl]      保留倍率
[isp]     运营商/直连
[yun]     入口服务商
[city]    加入口城市
[game]    保留游戏标识
[sheng]   加入口省份
[flag]    添加落地旗帜
[offtz]   关闭脚本通知
[snone]   清理地区只有一个节点的01
[h=]      缓存过期时间小时
[tz=]     通知显示的机场名
[sn=]     国家与序号之间的分隔符，默认为空格
[min=]    缓存过期时间分钟,h和min只能二选一
[fgf=]    入口和落地之间的分隔符，默认为空格
[name=]   添加机场名称前缀

[yw]  落地为英文缩写，不建议与其他入口参数配合使用 因为其他参数api没有返回英文
[bs=] 批处理节点数建议10左右，如果经常读不到节点建议减小批处理个数，手机网络压力山大 (:
[timeout=] HTTP请求返回结果《无任何缓存》的超时时间，默认1510ms
[cd=] 当《部分有缓存，部分节点没有缓存》的情况下，请求的超时时间，默认460ms。 超时后只会重试一次,共2次
仅当节点缓存《接近完全》的情况下, 才建议设置[cd=]的值小于50，这样会直接读取缓存。不发送请求, 减少不必要的请求,和时间 

异常：如遇问题，Loon可以进入[配置]→[持久化缓存]→[删除指定数据]→输入Key [sub-store-cached-script-resource]并删除缓存。
Surge需要进入[脚本编辑器]→左下角[设置]→[$persistentStore]  [sub-store-cached-script-resource]删除缓存数据。
参数必须以"#"开头，多个参数使用"&"连接 https://github.com/Keywos/rule/raw/main/cname.js#city&isp
*/
const $ = $substore,
  bl = $arguments["bl"],
  yw = $arguments["yw"],
  isp = $arguments["isp"],
  yun = $arguments["yun"],
  city = $arguments["city"],
  flag = $arguments["flag"],
  game = $arguments["game"],
  sheng = $arguments["sheng"],
  offtz = $arguments["offtz"],
  debug = $arguments["debug"],
  numone = $arguments["snone"],
  h = $arguments.h ? decodeURI($arguments.h) : "",
  min = $arguments.min ? decodeURI($arguments.min) : "",
  tzname = $arguments.tz ? decodeURI($arguments.tz) : "",
  keynames = $arguments.name ? decodeURI($arguments.name) : "";
const FGF = $arguments.fgf == undefined ? " " : decodeURI($arguments.fgf),
  XHFGF = $arguments.sn == undefined ? " " : decodeURI($arguments.sn),
  { isLoon: isLoon, isSurge: isSurge } = $substore.env,
  dns = $arguments["dnsjx"],
  target = isLoon ? "Loon" : isSurge ? "Surge" : undefined;
let cd = $arguments["cd"] ? $arguments["cd"] : 460,
  timeout = $arguments["timeout"] ? $arguments["timeout"] : 1520,
  writet = "",
  innum = 1728e5,
  loontrue = false,
  onen = false,
  Sue = false,
  v4 = false,
  v6 = false,
  noali = false;
if (min !== "") {
  Sue = true;
  innum = parseInt(min, 10) * 6e4;
  writet = $persistentStore.write(JSON.stringify(innum), "time-cache");
} else if (h !== "") {
  Sue = true;
  innum = parseInt(h, 10) * 36e5;
  writet = $persistentStore.write(JSON.stringify(innum), "time-cache");
} else {
  writet = $persistentStore.write(JSON.stringify(innum), "time-cache");
}
function getflag(e) {
  const t = e
    .toUpperCase()
    .split("")
    .map((e) => 127397 + e.charCodeAt());
  return String.fromCodePoint(...t).replace(/🇹🇼/g, "🇨🇳");
}
function sleep(e) {
  return new Promise((t) => setTimeout(t, e));
}
let apiRead = 0,
  apiw = 0;
const outs = new Map();
async function OUTIA(e) {
  const t = getid(e);
  if (outs.has(t)) {
    return outs.get(t);
  }
  const n = scriptResourceCache.get(t);
  if (n) {
    apiRead++;
    return n;
  } else {
    const n = 1;
    const s = new Promise((i, r) => {
      if (cd < 51 && onen) {
        return s;
      } else {
        const s = async (o) => {
          const a = `http://ip-api.com/json?lang=zh-CN&fields=status,message,country,countryCode,city,query`;
          let c = ProxyUtils.produce([e], target);
          try {
            const e = await Promise.race([
              $.http.get({ url: a, node: c, "policy-descriptor": c }),
              new Promise((e, t) =>
                setTimeout(() => t(new Error("timeout")), timeout)
              ),
            ]);
            const n = JSON.parse(e.body);
            if (n.status === "success") {
              scriptResourceCache.set(t, n);
              apiw++;
              i(n);
            } else {
              r(new Error(n.message));
            }
          } catch (e) {
            if (o < n) {
              s(o + 1);
            } else {
              r(e);
            }
          }
        };
        s(0);
      }
    });
    outs.set(t, s);
    return s;
  }
}
const ali = new Map();
async function AliD(e) {
  const t =
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(
      e
    );
  if (t) {
    return e;
  } else {
    const t = getaliid(e);
    if (ali.has(t)) {
      return ali.get(t);
    }
    const n = scriptResourceCache.get(t);
    if (n) {
      return n;
    } else {
      const n = new Promise((s, i) => {
        if (cd < 51 && onen) {
          return n;
        } else {
          const n = `http://223.5.5.5/resolve?name=${e}&type=A&short=1`;
          const r = new Promise((e, t) => {
            setTimeout(() => {
              t(new Error("timeout"));
            }, timeout);
          });
          const o = $.http
            .get({ url: n })
            .then((e) => {
              const n = JSON.parse(e.body);
              if (n.length > 0) {
                scriptResourceCache.set(t, n[0]);
                s(n[0]);
              } else {
                s("keyn");
              }
            })
            .catch((e) => {
              i(e);
            });
          Promise.race([r, o]).catch((e) => {
            i(e);
          });
        }
      });
      ali.set(t, n);
      return n;
    }
  }
}
const spapi = new Map();
async function SPEC(e, t) {
  const n = getspcn(e);
  if (spapi.has(n)) {
    return spapi.get(n);
  }
  const s = scriptResourceCache.get(n);
  if (s) {
    return s;
  } else {
    const e = new Promise((s, i) => {
      if (cd < 51 && onen) {
        return e;
      } else {
        const e = t;
        const r = `https://api-v3.speedtest.cn/ip?ip=${e}`;
        const o = new Promise((e, t) => {
          setTimeout(() => {
            t(new Error("timeout"));
          }, timeout);
        });
        const a = $.http
          .get({ url: r })
          .then((e) => {
            const t = JSON.parse(e.body);
            if (t.data) {
              const {
                country: e,
                province: i,
                city: r,
                isp: o,
                ip: a,
              } = t.data;
              const c = { country: e, regionName: i, city: r, isp: o, ip: a };
              s(c);
              scriptResourceCache.set(n, c);
            } else {
              i(new Error());
            }
          })
          .catch((e) => {
            i(e);
          });
        Promise.race([o, a]).catch((e) => {
          i(e);
        });
      }
    });
    ins.set(n, e);
    return e;
  }
}
const ins = new Map();
async function INIA(e) {
  const t = getinid(e);
  if (ins.has(t)) {
    return ins.get(t);
  }
  const n = scriptResourceCache.get(t);
  if (n) {
    return n;
  } else {
    const n = new Promise((s, i) => {
      if (cd < 51 && onen) {
        return n;
      } else {
        const n = e;
        const r = `http://ip-api.com/json/${n}?lang=zh-CN&fields=status,message,country,city,query,regionName`;
        const o = new Promise((e, t) => {
          setTimeout(() => {
            t(new Error("timeout"));
          }, timeout);
        });
        const a = $.http
          .get({ url: r })
          .then((e) => {
            const i = JSON.parse(e.body);
            if (i.status === "success") {
              scriptResourceCache.set(t, i);
              s(i);
            } else {
              s(n);
            }
          })
          .catch((e) => {
            i(e);
          });
        Promise.race([o, a]).catch((e) => {
          i(e);
        });
      }
    });
    ins.set(t, n);
    return n;
  }
}
function removels(e) {
  const t = new Set();
  const n = [];
  for (const s of e) {
    if (s.qc && !t.has(s.qc)) {
      t.add(s.qc);
      n.push(s);
    }
  }
  return n;
}
function removeqc(e) {
  const t = new Set();
  const n = [];
  for (const s of e) {
    if (!t.has(s.qc)) {
      t.add(s.qc);
      const e = { ...s };
      delete e.qc;
      n.push(e);
    }
  }
  return n;
}
const nlc =
  /\u9080\u8bf7|\u8fd4\u5229|\u5faa\u73af|\u5b98\u7f51|\u5ba2\u670d|\u7f51\u7ad9|\u7f51\u5740|\u83b7\u53d6|\u8ba2\u9605|\u6d41\u91cf|\u5230\u671f|\u4e0b\u6b21|\u7248\u672c|\u5b98\u5740|\u5907\u7528|\u5230\u671f|\u8fc7\u671f|\u5df2\u7528|\u56fd\u5185|\u56fd\u9645|\u56fd\u5916|\u8054\u7cfb|\u90ae\u7bb1|\u5de5\u5355|\u8d29\u5356|\u5012\u5356|\u9632\u6b62|(\b(USE|USED|TOTAL|EXPIRE|EMAIL)\b)|\d\s?g/i;
function jxh(e) {
  const t = e.reduce((e, t) => {
    const n = e.find((e) => e.name === t.name);
    if (n) {
      n.count++;
      n.items.push({
        ...t,
        name: `${t.name}${XHFGF}${n.count.toString().padStart(2, "0")}`,
      });
    } else {
      e.push({
        name: t.name,
        count: 1,
        items: [{ ...t, name: `${t.name}${XHFGF}01` }],
      });
    }
    return e;
  }, []);
  const n = t.flatMap((e) => e.items);
  e.splice(0, e.length, ...n);
  return e;
}
function onee(e) {
  const t = e.reduce((e, t) => {
    const n = t.name.replace(/[^A-Za-z0-9\u00C0-\u017F\u4E00-\u9FFF]+\d+$/, "");
    if (!e[n]) {
      e[n] = [];
    }
    e[n].push(t);
    return e;
  }, {});
  for (const e in t) {
    if (t[e].length === 1 && t[e][0].name.endsWith("01")) {
      const n = t[e][0];
      n.name = e;
    }
  }
  return e;
}
function zhTime(e) {
  e = e.toString().replace(/-/g, "");
  if (e < 1e3) {
    return `${Math.round(e)}毫秒`;
  } else if (e < 6e4) {
    return `${Math.round(e / 1e3)}秒`;
  } else if (e < 36e5) {
    return `${Math.round(e / 6e4)}分钟`;
  } else if (e >= 36e5) {
    return `${Math.round(e / 36e5)}小时`;
  }
}
const regexArray = [/\u6e38\u620f|game/i];
const valueArray = ["Game"];
async function operator(e) {
  let t = 0;
  const n = new Date();
  const s = isLoon || isSurge;
  if (!s) {
    $.error(`No Loon or Surge`);
    return e;
  }
  if (typeof scriptResourceCache === "undefined") {
    console.log(
      "\nNCNAME: 不支持此 SubStore,\n查看脚本说明\nhttps://github.com/Keywos/rule/raw/main/cname.js"
    );
    if (target == "Surge") {
      $notification.post(
        "NCNAME Sub-Store未更新",
        "",
        "请点击或查看log查看脚本说明安装对应版本",
        {
          url: "https://github.com/Keywos/rule/raw/main/Sub-Store/Sub-Store.sgmodule",
        }
      );
    } else if (target == "Loon") {
      $notification.post(
        "NCNAME Sub-Store未更新",
        "",
        "请点击安装插件, 或查看log安装对应版本, 并关闭原本的substore",
        "loon://import?plugin=https://gitlab.com/lodepuly/vpn_tool/-/raw/main/Tool/Loon/Plugin/Sub-Store.plugin"
      );
    }
    return e;
  }
  var i = $arguments["bs"] ? $arguments["bs"] : 12;
  const r = e.length;
  console.log(`设定api超时: ${zhTime(timeout)}`);
  console.log(`有缓api超时: ${zhTime(cd)}`);
  console.log(`批处理节点数: ${i} 个`);
  console.log(`开始处理节点: ${r} 个`);
  e = e.filter((e) => !nlc.test(e.name));
  let o = 0,
    a = "",
    c = "",
    u = false;
  do {
    while (o < e.length && !u) {
      const t = e.slice(o, o + 1);
      await Promise.all(
        t.map(async (e) => {
          try {
            const t = new Map();
            const n = getid(e);
            if (t.has(n)) {
              return t.get(n);
            }
            const s = scriptResourceCache.get(n);
            if (s) {
              if (!onen) {
                timeout = cd;
                onen = true;
                u = true;
              }
              const e = scriptResourceCache.gettime(n);
              let t = new Date().getTime();
              let s = "";
              if (target == "Loon") {
                let n = "";
                const i = {
                  "1分钟": 6e4,
                  "5分钟": 3e5,
                  "10分钟": 6e5,
                  "30分钟": 18e5,
                  "1小时": 36e5,
                  "2小时": 72e5,
                  "3小时": 108e5,
                  "6小时": 216e5,
                  "12小时": 432e5,
                  "24小时": 864e5,
                  "48小时": 1728e5,
                  "72小时": 2592e5,
                  参数传入: "innums",
                };
                c = $persistentStore.read("节点缓存有效期");
                n = i[c] || 1728e5;
                if (n == "innums") {
                  n = innum;
                }
                s = zhTime(parseInt(e, 10) - t + parseInt(n, 10));
              } else if (target == "Surge" && Sue) {
                s = zhTime(parseInt(e, 10) - t + parseInt(innum, 10));
              } else {
                s = zhTime(parseInt(e, 10) - t + parseInt(TIMEDKEY, 10));
              }
              a = `, ${s}后过期 \n`;
            }
          } catch (e) {}
        })
      );
      o += 1;
    }
    let n = 0;
    while (n < e.length) {
      const t = e.slice(n, n + i);
      await Promise.all(
        t.map(async (e) => {
          try {
            const t = await AliD(e.server);
            if (t == "keyn") {
              noali = true;
            } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) {
              v4 = true;
            } else if (/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(t)) {
              v6 = true;
            }
            const n = await OUTIA(e);
            let s = "",
              i = "",
              r = "",
              o = "",
              a = "",
              c = "",
              u = "",
              f = "",
              m = "",
              g = "",
              l = "";
            if (n.country == "中国") {
              s = n.city;
            } else {
              s = n.country;
              if (yw) {
                s = n.countryCode;
              }
            }
            if (!noali || v4) {
              const s = await SPEC(e.server, t);
              i = s.ip;
              if (debug) {
                console.log("国内入口🌸 " + JSON.stringify(s));
              }
              if (debug) {
                console.log("落地信息🍓 " + JSON.stringify(n));
              }
              if (s.country == "中国" && s.city !== "") {
                if (city && sheng) {
                  if (s.city == s.regionName) {
                    u = s.city;
                  } else {
                    u = s.regionName + FGF + s.city;
                  }
                } else if (city) {
                  u = s.city;
                } else if (sheng) {
                  u = s.regionName;
                }
                if (/电信|联通|移动|广电/.test(s.isp)) {
                  o = s.isp.replace(/中国/g, "");
                } else if (yun) {
                  o = s.isp;
                } else {
                  o = "企业";
                }
                if (flag) {
                  if (isp) {
                    const e = { 电信: "🅳", 联通: "🅻", 移动: "🆈", 广电: "🅶" };
                    if (e.hasOwnProperty(o)) {
                      a = e[o];
                    } else {
                      a = "🅲";
                    }
                  }
                } else {
                  a = o;
                }
              }
            } else {
              const t = await INIA(e.server);
              if (debug) {
                console.log("ipapi入口 " + JSON.stringify(t));
              }
              if (t.country == "中国") {
                if (city && sheng) {
                  if (t.city == t.regionName) {
                    u = t.city;
                  } else {
                    u = t.regionName + FGF + t.city;
                  }
                } else if (city) {
                  u = t.city;
                } else if (sheng) {
                  u = t.regionName;
                }
                o = "";
                if (flag) {
                  a = "🅲";
                }
              } else {
                u = t.country;
                o = t.country;
                if (u == s) {
                  u = "直连";
                  o = "";
                }
                if (flag) {
                  a = "🆉";
                }
              }
              i = t.ip;
            }
            regexArray.forEach((t, n) => {
              if (t.test(e.name)) {
                f = valueArray[n];
              }
            });
            if (
              (isp && city) ||
              (sheng && city) ||
              (isp && sheng) ||
              (sheng && isp && city) ||
              yun
            ) {
              if (flag || yun || sheng || city) {
                m = a + u + FGF;
              } else {
                m = u + o + FGF;
              }
            } else if (flag) {
              m = a + FGF;
            } else if (isp || yun) {
              m = o + FGF;
            } else if (city || sheng) {
              m = u + FGF;
            } else {
              m = "";
            }
            if (flag && !isp && !city && !sheng && !yun) {
              m = "";
            }
            if (game) {
              if (f === "") {
                c = "";
              } else {
                const e = { Game: "🎮" };
                if (e.hasOwnProperty(f)) {
                  c = e[f];
                } else {
                  c = "";
                }
              }
            } else {
              c = "";
            }
            if (bl) {
              const t = e.name.match(
                /(倍率\D?((\d\.)?\d+)\D?)|((\d\.)?\d+)(倍|X|x|×)/
              );
              if (t) {
                const e = t[0].match(/(\d[\d.]*)/)[0];
                if (e !== "1") {
                  const t = e + "×";
                  g = t;
                }
              }
              if (c !== "") {
                r = s + c + g;
              } else if (g !== "") {
                r = s + c + XHFGF + g;
              } else {
                r = s;
              }
            } else {
              r = s + c;
            }
            if (flag) {
              l = getflag(n.countryCode);
            } else {
              l = "";
            }
            if (dns) {
              e.server = i;
            }
            e.name = m + l + r;
            e.qc = i + n.query;
          } catch (e) {}
        })
      );
      if (!onen) {
        await sleep(50);
      }
      n += i;
    }
    t++;
    e = removels(e);
    if (e.length < r * 0.2 && t === 1) {
      await sleep(50);
    }
  } while (e.length < r * 0.2 && t < 2);
  if (t < 3) {
    console.log("任务执行次数: " + t);
  }
  e = removeqc(e);
  e = jxh(e);
  if (keynames !== "") {
    e.forEach((e) => {
      e.name = keynames + " " + e.name;
    });
  }
  numone && (e = onee(e));
  let f = e.length;
  const m = new Date();
  const g = m.getTime() - n.getTime();
  if (dns) {
    console.log(`dns解析后共: ${f} 个`);
  }
  apiRead > 0 ? console.log(`读取api缓存: ${apiRead} 个`) : null;
  apiw > 0 ? console.log(`写入api缓存: ${apiw} 个`) : null;
  console.log(`处理完后剩余: ${f} 个`);
  if (target == "Loon") {
    console.log("缓存过期时间: " + c + ", 还剩" + a.replace(/,|\n/g, ""));
  } else {
    console.log(
      "缓存过期时间: " + zhTime(TIMEDKEY) + ", 还剩" + a.replace(/,|\n/g, "")
    );
  }
  console.log(`此方法总用时: ${zhTime(g)}\n----For New CNAME----`);
  const l = apiRead ? `读取缓存:${apiRead} ` : "";
  const d = apiw ? `写入缓存:${apiw}, ` : "";
  const h = f == r ? "全部通过测试, " : "去除无效节点后有" + f + "个, ";
  if (!offtz) {
    $notification.post(
      `${tzname}共${r}个节点`,
      "",
      `${d}${l}${a}${h}用时:${zhTime(g)}`
    );
  }
  return e;
}
var MD5 = function (e) {
  var t = M(V(Y(X(e), 8 * e.length)));
  return t.toLowerCase();
};
function M(e) {
  for (var t, n = "0123456789ABCDEF", s = "", i = 0; i < e.length; i++)
    (t = e.charCodeAt(i)), (s += n.charAt((t >>> 4) & 15) + n.charAt(15 & t));
  return s;
}
function X(e) {
  for (var t = Array(e.length >> 2), n = 0; n < t.length; n++) t[n] = 0;
  for (n = 0; n < 8 * e.length; n += 8)
    t[n >> 5] |= (255 & e.charCodeAt(n / 8)) << n % 32;
  return t;
}
function V(e) {
  for (var t = "", n = 0; n < 32 * e.length; n += 8)
    t += String.fromCharCode((e[n >> 5] >>> n % 32) & 255);
  return t;
}
function Y(e, t) {
  (e[t >> 5] |= 128 << t % 32), (e[14 + (((t + 64) >>> 9) << 4)] = t);
  for (
    var n = 1732584193, s = -271733879, i = -1732584194, r = 271733878, o = 0;
    o < e.length;
    o += 16
  ) {
    var a = n,
      c = s,
      u = i,
      f = r;
    (s = md5_ii(
      (s = md5_ii(
        (s = md5_ii(
          (s = md5_ii(
            (s = md5_hh(
              (s = md5_hh(
                (s = md5_hh(
                  (s = md5_hh(
                    (s = md5_gg(
                      (s = md5_gg(
                        (s = md5_gg(
                          (s = md5_gg(
                            (s = md5_ff(
                              (s = md5_ff(
                                (s = md5_ff(
                                  (s = md5_ff(
                                    s,
                                    (i = md5_ff(
                                      i,
                                      (r = md5_ff(
                                        r,
                                        (n = md5_ff(
                                          n,
                                          s,
                                          i,
                                          r,
                                          e[o + 0],
                                          7,
                                          -680876936
                                        )),
                                        s,
                                        i,
                                        e[o + 1],
                                        12,
                                        -389564586
                                      )),
                                      n,
                                      s,
                                      e[o + 2],
                                      17,
                                      606105819
                                    )),
                                    r,
                                    n,
                                    e[o + 3],
                                    22,
                                    -1044525330
                                  )),
                                  (i = md5_ff(
                                    i,
                                    (r = md5_ff(
                                      r,
                                      (n = md5_ff(
                                        n,
                                        s,
                                        i,
                                        r,
                                        e[o + 4],
                                        7,
                                        -176418897
                                      )),
                                      s,
                                      i,
                                      e[o + 5],
                                      12,
                                      1200080426
                                    )),
                                    n,
                                    s,
                                    e[o + 6],
                                    17,
                                    -1473231341
                                  )),
                                  r,
                                  n,
                                  e[o + 7],
                                  22,
                                  -45705983
                                )),
                                (i = md5_ff(
                                  i,
                                  (r = md5_ff(
                                    r,
                                    (n = md5_ff(
                                      n,
                                      s,
                                      i,
                                      r,
                                      e[o + 8],
                                      7,
                                      1770035416
                                    )),
                                    s,
                                    i,
                                    e[o + 9],
                                    12,
                                    -1958414417
                                  )),
                                  n,
                                  s,
                                  e[o + 10],
                                  17,
                                  -42063
                                )),
                                r,
                                n,
                                e[o + 11],
                                22,
                                -1990404162
                              )),
                              (i = md5_ff(
                                i,
                                (r = md5_ff(
                                  r,
                                  (n = md5_ff(
                                    n,
                                    s,
                                    i,
                                    r,
                                    e[o + 12],
                                    7,
                                    1804603682
                                  )),
                                  s,
                                  i,
                                  e[o + 13],
                                  12,
                                  -40341101
                                )),
                                n,
                                s,
                                e[o + 14],
                                17,
                                -1502002290
                              )),
                              r,
                              n,
                              e[o + 15],
                              22,
                              1236535329
                            )),
                            (i = md5_gg(
                              i,
                              (r = md5_gg(
                                r,
                                (n = md5_gg(
                                  n,
                                  s,
                                  i,
                                  r,
                                  e[o + 1],
                                  5,
                                  -165796510
                                )),
                                s,
                                i,
                                e[o + 6],
                                9,
                                -1069501632
                              )),
                              n,
                              s,
                              e[o + 11],
                              14,
                              643717713
                            )),
                            r,
                            n,
                            e[o + 0],
                            20,
                            -373897302
                          )),
                          (i = md5_gg(
                            i,
                            (r = md5_gg(
                              r,
                              (n = md5_gg(n, s, i, r, e[o + 5], 5, -701558691)),
                              s,
                              i,
                              e[o + 10],
                              9,
                              38016083
                            )),
                            n,
                            s,
                            e[o + 15],
                            14,
                            -660478335
                          )),
                          r,
                          n,
                          e[o + 4],
                          20,
                          -405537848
                        )),
                        (i = md5_gg(
                          i,
                          (r = md5_gg(
                            r,
                            (n = md5_gg(n, s, i, r, e[o + 9], 5, 568446438)),
                            s,
                            i,
                            e[o + 14],
                            9,
                            -1019803690
                          )),
                          n,
                          s,
                          e[o + 3],
                          14,
                          -187363961
                        )),
                        r,
                        n,
                        e[o + 8],
                        20,
                        1163531501
                      )),
                      (i = md5_gg(
                        i,
                        (r = md5_gg(
                          r,
                          (n = md5_gg(n, s, i, r, e[o + 13], 5, -1444681467)),
                          s,
                          i,
                          e[o + 2],
                          9,
                          -51403784
                        )),
                        n,
                        s,
                        e[o + 7],
                        14,
                        1735328473
                      )),
                      r,
                      n,
                      e[o + 12],
                      20,
                      -1926607734
                    )),
                    (i = md5_hh(
                      i,
                      (r = md5_hh(
                        r,
                        (n = md5_hh(n, s, i, r, e[o + 5], 4, -378558)),
                        s,
                        i,
                        e[o + 8],
                        11,
                        -2022574463
                      )),
                      n,
                      s,
                      e[o + 11],
                      16,
                      1839030562
                    )),
                    r,
                    n,
                    e[o + 14],
                    23,
                    -35309556
                  )),
                  (i = md5_hh(
                    i,
                    (r = md5_hh(
                      r,
                      (n = md5_hh(n, s, i, r, e[o + 1], 4, -1530992060)),
                      s,
                      i,
                      e[o + 4],
                      11,
                      1272893353
                    )),
                    n,
                    s,
                    e[o + 7],
                    16,
                    -155497632
                  )),
                  r,
                  n,
                  e[o + 10],
                  23,
                  -1094730640
                )),
                (i = md5_hh(
                  i,
                  (r = md5_hh(
                    r,
                    (n = md5_hh(n, s, i, r, e[o + 13], 4, 681279174)),
                    s,
                    i,
                    e[o + 0],
                    11,
                    -358537222
                  )),
                  n,
                  s,
                  e[o + 3],
                  16,
                  -722521979
                )),
                r,
                n,
                e[o + 6],
                23,
                76029189
              )),
              (i = md5_hh(
                i,
                (r = md5_hh(
                  r,
                  (n = md5_hh(n, s, i, r, e[o + 9], 4, -640364487)),
                  s,
                  i,
                  e[o + 12],
                  11,
                  -421815835
                )),
                n,
                s,
                e[o + 15],
                16,
                530742520
              )),
              r,
              n,
              e[o + 2],
              23,
              -995338651
            )),
            (i = md5_ii(
              i,
              (r = md5_ii(
                r,
                (n = md5_ii(n, s, i, r, e[o + 0], 6, -198630844)),
                s,
                i,
                e[o + 7],
                10,
                1126891415
              )),
              n,
              s,
              e[o + 14],
              15,
              -1416354905
            )),
            r,
            n,
            e[o + 5],
            21,
            -57434055
          )),
          (i = md5_ii(
            i,
            (r = md5_ii(
              r,
              (n = md5_ii(n, s, i, r, e[o + 12], 6, 1700485571)),
              s,
              i,
              e[o + 3],
              10,
              -1894986606
            )),
            n,
            s,
            e[o + 10],
            15,
            -1051523
          )),
          r,
          n,
          e[o + 1],
          21,
          -2054922799
        )),
        (i = md5_ii(
          i,
          (r = md5_ii(
            r,
            (n = md5_ii(n, s, i, r, e[o + 8], 6, 1873313359)),
            s,
            i,
            e[o + 15],
            10,
            -30611744
          )),
          n,
          s,
          e[o + 6],
          15,
          -1560198380
        )),
        r,
        n,
        e[o + 13],
        21,
        1309151649
      )),
      (i = md5_ii(
        i,
        (r = md5_ii(
          r,
          (n = md5_ii(n, s, i, r, e[o + 4], 6, -145523070)),
          s,
          i,
          e[o + 11],
          10,
          -1120210379
        )),
        n,
        s,
        e[o + 2],
        15,
        718787259
      )),
      r,
      n,
      e[o + 9],
      21,
      -343485551
    )),
      (n = safe_add(n, a)),
      (s = safe_add(s, c)),
      (i = safe_add(i, u)),
      (r = safe_add(r, f));
  }
  return Array(n, s, i, r);
}
function md5_cmn(e, t, n, s, i, r) {
  return safe_add(bit_rol(safe_add(safe_add(t, e), safe_add(s, r)), i), n);
}
function md5_ff(e, t, n, s, i, r, o) {
  return md5_cmn((t & n) | (~t & s), e, t, i, r, o);
}
function md5_gg(e, t, n, s, i, r, o) {
  return md5_cmn((t & s) | (n & ~s), e, t, i, r, o);
}
function md5_hh(e, t, n, s, i, r, o) {
  return md5_cmn(t ^ n ^ s, e, t, i, r, o);
}
function md5_ii(e, t, n, s, i, r, o) {
  return md5_cmn(n ^ (t | ~s), e, t, i, r, o);
}
function safe_add(e, t) {
  var n = (65535 & e) + (65535 & t);
  return (((e >> 16) + (t >> 16) + (n >> 16)) << 16) | (65535 & n);
}
function bit_rol(e, t) {
  return (e << t) | (e >>> (32 - t));
}
function getid(e) {
  let t = "ld";
  return MD5(`${t}-${e.server}-${e.port}`);
}
function getinid(e) {
  let t = "ia";
  return MD5(`${t}-${e}`);
}
function getaliid(e) {
  let t = "al";
  return MD5(`${t}-${e}`);
}
function getspcn(e) {
  let t = "sc";
  return MD5(`${t}-${e}`);
}
