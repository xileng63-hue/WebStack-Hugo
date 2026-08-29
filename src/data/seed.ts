import type { Category, NavLink, NavigationData } from '../types'
import { DEFAULT_GROUPS, groupToCategory } from '../lib/categoryGroups'

type RawCategory = {
  name: string
  emoji: string
  links: Array<[name: string, url: string, description: string]>
}

const rawCategories: RawCategory[] = [
  {
    name: '常用推荐', emoji: '日常', links: [
      ['百度', 'https://www.baidu.com/', '国产搜索'],
      ['QQ 邮箱', 'https://mail.qq.com/', '腾讯 QQ 邮箱'],
      ['开源中国', 'https://www.oschina.net/', '中文开源技术交流社区'],
      ['公众号平台', 'https://mp.weixin.qq.com/', '微信公众号管理平台'],
      ['GitHub', 'https://github.com/', '全球开源协作社区'],
      ['知乎', 'https://www.zhihu.com/', '中文问答与内容社区'],
      ['V2EX', 'https://www.v2ex.com/', '创意工作者的社区'],
      ['豆哥配音', 'https://www.douge.com/', 'AI 智能语音合成工具'],
    ],
  },
  {
    name: '国产 AI', emoji: '工具', links: [
      ['即梦', 'https://jimeng.jianying.com/', '字节跳动旗下 AI 创作工具'],
      ['DeepSeek', 'https://chat.deepseek.com/', '国产通用 AI 助手'],
      ['腾讯混元 3D', 'https://3d.hunyuan.tencent.com/', '腾讯旗下 AI 3D 建模'],
      ['豆包', 'https://www.doubao.com/', '字节跳动旗下 AI 智能助手'],
      ['可灵 AI', 'https://app.klingai.com/', '快手推出的 AI 视频生成工具'],
    ],
  },
  {
    name: '国外 AI', emoji: '工具', links: [
      ['Gemini', 'https://gemini.google.com/', 'Google AI 助手'],
      ['Sora', 'https://sora.chatgpt.com/', 'OpenAI 视频生成工具'],
      ['Viggle', 'https://viggle.ai/login', 'AI 人物动画创作'],
      ['ChatGPT', 'https://chatgpt.com/', 'OpenAI 智能助手'],
      ['Noiz AI', 'https://noiz.ai/voice/lib', 'AI 配音工具'],
    ],
  },
  {
    name: '影音视频', emoji: '后期', links: [
      ['抖音网页版', 'https://www.douyin.com/', '记录美好生活'],
      ['腾讯视频', 'https://v.qq.com/', '海量视频在线观看'],
      ['MX 动漫', 'https://www.mxdm.xyz/', '动漫内容站点'],
      ['喵呜动漫', 'https://www.aowu.tv/', '动漫内容站点'],
      ['优酷', 'https://www.youku.com/', '这个世界很酷'],
      ['爱奇艺', 'https://www.iqiyi.com/', '在线视频平台'],
      ['哔哩哔哩', 'https://www.bilibili.com/', '视频与弹幕社区'],
      ['QQ 音乐', 'https://y.qq.com/', '在线音乐平台'],
      ['网易云音乐', 'https://music.163.com/', '发现与分享音乐'],
      ['电影狗', 'https://www.dianyinggou.com/', '电影资源索引'],
      ['美剧迷', 'https://www.meijumi.net/', '美剧内容索引'],
      ['YouTube', 'https://www.youtube.com/', '全球视频平台'],
      ['Kiss 二次元', 'https://www.kissacg.org/portal.php', '动漫内容索引'],
      ['TikTok', 'https://www.tiktok.com/', '全球短视频平台'],
    ],
  },
  {
    name: '游戏竞技', emoji: '日常', links: [
      ['LOL 布锅锅', 'https://voice.buguoguo.cn/', '英雄联盟语音内容'],
      ['台服战地', 'https://ava.mangot5.com/ava/index', '台服 AVA 战地之王'],
    ],
  },
  {
    name: '办公学习', emoji: '日常', links: [
      ['有道词典', 'https://www.youdao.com/', '免费多语种在线词典'],
      ['有道翻译', 'https://fanyi.youdao.com/', '在线翻译工具'],
      ['谷歌翻译', 'https://translate.google.cn/', 'Google 在线翻译'],
      ['ProcessOn', 'https://www.processon.com/', '免费在线作图与实时协作'],
    ],
  },
  {
    name: '网盘资源', emoji: '工具', links: [
      ['百度网盘', 'https://pan.baidu.com/', '云存储与资源分享'],
      ['阿里云盘', 'https://www.aliyundrive.com/', '你的数字世界'],
      ['天翼云盘', 'https://cloud.189.cn/', '家庭云与文件备份'],
      ['坚果云', 'https://www.jianguoyun.com/', '文件同步与协作'],
    ],
  },
  {
    name: '图标素材', emoji: '素材', links: [
      ['Iconfinder', 'https://www.iconfinder.com/', '免费与付费矢量图标'],
      ['Iconfont', 'https://www.iconfont.cn/', '阿里巴巴矢量图标库'],
      ['Iconmonstr', 'https://iconmonstr.com/', '简洁免费图标'],
      ['Icon Archive', 'https://www.iconarchive.com/', '大型图标搜索站'],
      ['FindIcons', 'https://findicons.com/', '免费图标搜索'],
      ['IcoMoon', 'https://icomoon.io/app/', 'Icon Font 与 SVG 生成器'],
      ['Easyicon', 'https://www.easyicon.net/', 'PNG、ICO 图标搜索'],
      ['Flaticon', 'https://www.flaticon.com/', '矢量图标素材库'],
      ['UICloud', 'https://ui-cloud.com/', 'UI 设计素材数据库'],
      ['Material Icons', 'https://fonts.google.com/icons', 'Google Material 图标'],
      ['Font Awesome', 'https://fontawesome.com/icons/', '常用 Web 图标库'],
      ['Ionicons', 'https://ionic.io/ionicons', 'Ionic 图标库'],
      ['Simple Line Icons', 'https://simplelineicons.github.io/', '简洁线性图标'],
    ],
  },
  {
    name: '图标设计', emoji: '设计', links: [
      ['Iconsfeed', 'https://www.iconsfeed.com/', 'iOS 图标画廊'],
      ['iOS Icon Gallery', 'https://www.iosicongallery.com/', '优秀 iOS 图标设计'],
      ['World Vector Logo', 'https://worldvectorlogo.com/', '品牌矢量 Logo 下载'],
      ['Instant Logo Search', 'https://instantlogosearch.com/', '快速搜索并下载 Logo'],
    ],
  },
  {
    name: '平面素材', emoji: '素材', links: [
      ['花瓣网', 'https://huaban.com/', '设计师灵感与素材平台'],
      ['Freepik', 'https://www.freepik.com/', '矢量、PSD 与图片素材'],
      ['Wallhalla', 'https://wallhalla.com/', '高清壁纸资源'],
      ['365PSD', 'https://365psd.com/', '免费 PSD 与插画素材'],
      ['Medialoot', 'https://medialoot.com/', '设计资源与模板'],
      ['千图网', 'https://www.58pic.com/', '设计素材下载'],
      ['千库网', 'https://588ku.com/', 'PNG 与背景素材'],
      ['我图网', 'https://www.ooopic.com/', '正版设计作品交易'],
      ['90 设计', 'https://90sheji.com/', '电商设计素材'],
      ['昵图网', 'https://www.nipic.com/', '原创素材共享平台'],
      ['懒人图库', 'https://www.lanrentuku.com/', '网页素材下载'],
      ['素材搜索', 'https://so.ui001.com/', '设计素材聚合搜索'],
      ['PS 饭团网', 'https://psefan.com/', '设计素材库'],
      ['素材中国', 'https://www.sccnn.com/', '免费素材共享平台'],
    ],
  },
  {
    name: '音效资源', emoji: '后期', links: [
      ['爱给网', 'https://www.aigei.com/', '音效、配乐与视频素材'],
      ['Freesound', 'https://freesound.org/', '开放声音素材社区'],
    ],
  },
  {
    name: '字体资源', emoji: '素材', links: [
      ['字体天下', 'https://www.fonts.net.cn/', '中文字体下载'],
      ['Google Fonts', 'https://fonts.google.com/', '开放 Web 字体'],
      ['Adobe Fonts', 'https://fonts.adobe.com/', '专业字体服务'],
      ['方正字库', 'https://www.foundertype.com/', '方正字库官方网站'],
      ['字体传奇网', 'https://ziticq.com/', '字体设计交流'],
      ['私藏字体', 'https://sicangziti.com/', '优质字体下载'],
      ['Font Squirrel', 'https://www.fontsquirrel.com/', '商用字体资源'],
      ['Urban Fonts', 'https://www.urbanfonts.com/', '免费英文字体'],
      ['Lost Type', 'https://www.losttype.com/', '独立数字字体厂牌'],
      ['Fonts2u', 'https://fonts2u.com/', 'Windows 与 Mac 字体'],
      ['Fontex', 'https://www.fontex.org/', '免费与付费字体'],
      ['FontM', 'https://fontm.com/', '免费字体下载'],
      ['MyFonts', 'https://www.myfonts.com/', '专业商业字体'],
      ['DaFont', 'https://www.dafont.com/', '免费字体档案'],
      ['OnlineWebFonts', 'https://www.onlinewebfonts.com/', 'Web 字体下载'],
      ['Abstract Fonts', 'https://www.abstractfonts.com/', '免费字体集合'],
    ],
  },
  {
    name: '图形创意', emoji: '设计', links: [
      ['Photoshop', 'https://www.adobe.com/cn/products/photoshop.html', '图像编辑与创意设计'],
      ['Affinity', 'https://affinity.serif.com/', '专业创意设计软件'],
      ['Illustrator', 'https://www.adobe.com/cn/products/illustrator/', '矢量图形与插图'],
      ['InDesign', 'https://www.adobe.com/cn/products/indesign.html', '页面设计、布局与出版'],
      ['Cinema 4D', 'https://www.maxon.net/en/cinema-4d', '专业 3D 创作软件'],
      ['3ds Max', 'https://www.autodesk.com/products/3ds-max/overview', '3D 建模、动画与渲染'],
      ['Blender', 'https://www.blender.org/', '免费开源 3D 创作套件'],
    ],
  },
  {
    name: '界面设计', emoji: '设计', links: [
      ['Sketch', 'https://www.sketch.com/', '数字产品设计工具'],
      ['Adobe XD', 'https://www.adobe.com/products/xd.html', '界面设计与原型工具'],
      ['InVision', 'https://www.invisionapp.com/', '设计原型与协作'],
      ['Marvel', 'https://marvelapp.com/', '设计、原型与协作'],
      ['Adobe Muse', 'https://creative.adobe.com/products/download/muse', '可视化网站设计'],
      ['Figma', 'https://www.figma.com/', '协作式界面设计平台'],
    ],
  },
  {
    name: '在线配色', emoji: '设计', links: [
      ['Khroma', 'https://www.khroma.co/', 'AI 配色发现工具'],
      ['UI Gradients', 'https://uigradients.com/', '漂亮的渐变配色'],
      ['Gradients.io', 'https://gradients.io/', '设计师渐变收藏'],
      ['CoolHue', 'https://webkul.github.io/coolhue/', '精选渐变色'],
      ['WebGradients', 'https://webgradients.com/', '180 组线性渐变'],
      ['Grabient', 'https://www.grabient.com/', '可视化渐变生成器'],
      ["The Day's Color", 'https://www.thedayscolor.com/', '每日色彩灵感'],
      ['Flat UI Colors', 'https://flatuicolors.com/', '扁平化 UI 色板'],
      ['Coolors', 'https://coolors.co/', '快速配色方案生成器'],
      ['Color Hunt', 'https://colorhunt.co/', '精选配色方案'],
      ['Adobe Color', 'https://color.adobe.com/zh/create/color-wheel', 'Adobe 在线色轮'],
      ['Flat UI Color Picker', 'https://www.flatuicolorpicker.com/', 'UI 扁平色选择器'],
      ['Trianglify', 'https://trianglify.io/', '几何渐变背景生成器'],
      ['Klart Colors', 'https://klart.co/colors/', '颜色与设计灵感'],
      ['Color Claim', 'https://www.vanschneider.com/colors', '独特色彩组合收藏'],
    ],
  },
  {
    name: '在线工具', emoji: '工具', links: [
      ['TinyPNG', 'https://tinypng.com/', '高质量图片压缩'],
      ['GoQR', 'https://goqr.me/', '在线二维码生成器'],
      ['Ezgif', 'https://ezgif.com/', '在线 GIF 制作与编辑'],
      ['Android 9-patch', 'https://inloop.github.io/shadow4android/', 'Android 阴影生成器'],
      ['Screen Sizes', 'https://screensiz.es/', '设备视口与像素密度'],
      ['SVGOMG', 'https://jakearchibald.github.io/svgomg/', 'SVG 在线压缩'],
      ['稿定抠图', 'https://www.gaoding.com/', '免费在线抠图与换背景'],
    ],
  },
  {
    name: '浏览器插件', emoji: '编程', links: [
      ['Wappalyzer', 'https://www.wappalyzer.com/', '识别网站技术栈'],
      ['Panda', 'https://usepanda.com/', '设计与科技资讯阅读器'],
      ['Sizzy', 'https://sizzy.co/', '响应式网站开发工具'],
      ['CSS Peeper', 'https://csspeeper.com/', '面向设计师的 CSS 查看器'],
      ['Sourcegraph', 'https://sourcegraph.com/', '云端代码搜索与导航'],
      ['Mustsee', 'https://mustsee.earth/', '新标签页旅行图片'],
    ],
  },
  {
    name: '资讯书籍', emoji: '外语', links: [
      ['微信读书', 'https://weread.qq.com/', '微信读书网页版'],
      ['书栈网', 'https://www.bookstack.cn/', 'IT 开源编程书籍阅读'],
    ],
  },
  {
    name: '博客论坛', emoji: '其他', links: [
      ['Inoreader', 'https://www.inoreader.com/', '新闻与 RSS 订阅阅读器'],
      ['Hacker News', 'https://news.ycombinator.com/', '科技与创业新闻社区'],
      ['经管之家', 'https://bbs.pinggu.org/', '经济管理与数据分析社区'],
      ['阮一峰的网络日志', 'https://www.ruanyifeng.com/blog/', '科技爱好者周刊'],
      ['酷壳', 'https://coolshell.cn/', '技术博客 CoolShell'],
    ],
  },
  {
    name: '设计规范', emoji: '设计', links: [
      ['Design Guidelines', 'https://www.designguidelines.co/', '产品设计规范集合'],
      ['Awesome Design Systems', 'https://github.com/alexpate/awesome-design-systems', '优秀设计系统集合'],
      ['Material Design', 'https://m3.material.io/', 'Google Material Design'],
      ['Human Interface Guidelines', 'https://developer.apple.com/design/human-interface-guidelines/', 'Apple 人机界面指南'],
      ['Photoshop Etiquette', 'https://photoshopetiquette.com/', 'Web 设计 PSD 规范'],
    ],
  },
  {
    name: '视频教程', emoji: '后期', links: [
      ['Photoshop Lady', 'https://www.photoshoplady.com/', 'Photoshop 教程集合'],
      ['Doyoudo', 'https://www.doyoudo.com/', '创意设计软件学习平台'],
      ['没位道', 'https://www.c945.com/web-ui-tutorial/', 'Web UI 视频公开课'],
      ['慕课网', 'https://www.imooc.com/', '在线编程与设计课程'],
    ],
  },
]

const accents = ['#6d5dfc', '#ff8f70', '#2bb3a3', '#ef6ca9', '#4d8df7', '#f2b84b']

const categories: Category[] = rawCategories.map((category, index) => ({
  id: `category-${index + 1}`,
  name: category.name,
  emoji: category.emoji,
  order_index: index,
  is_visible: true,
}))

const links: NavLink[] = rawCategories.flatMap((category, categoryIndex) =>
  category.links.map(([name, url, description], linkIndex) => ({
    id: `link-${categoryIndex + 1}-${linkIndex + 1}`,
    category_id: `category-${categoryIndex + 1}`,
    name,
    url,
    description,
    icon_url: '',
    accent: accents[(categoryIndex + linkIndex) % accents.length],
    tags: [],
    order_index: linkIndex,
    is_visible: true,
    is_featured: categoryIndex === 0 && linkIndex < 4,
  })),
)

export const seedData: NavigationData = {
  categories: [...categories, ...DEFAULT_GROUPS.map(groupToCategory)],
  links,
  settings: {
    id: 'main',
    title: 'HJCM 灵感导航',
    subtitle: '把常用工具、创作灵感和优质资源，收进一个随时可编辑的主页。',
    announcement: '旧站内容已迁移 · 现在可以从管理后台自由编辑',
    footer: 'HJCM Navigation · 认真收藏每一个好网站',
    logo_text: 'HJ',
    accent: '#6d5dfc',
  },
}
