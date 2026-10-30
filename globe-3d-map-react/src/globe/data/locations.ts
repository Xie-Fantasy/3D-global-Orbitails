import type { RawLocation } from "../types/data"

export const LOCATIONS: readonly RawLocation[] = Object.freeze([
  { id: "gz", name: "Guangzhou", nameZh: "广州", country: "China", countryZh: "中国", coordinate: [113.2644, 23.1291], type: "hub", value: 320, priority: 100 },
  { id: "bj", name: "Beijing", nameZh: "北京", country: "China", countryZh: "中国", coordinate: [116.4074, 39.9042], type: "city", value: 168, priority: 88 },
  { id: "tokyo", name: "Tokyo", nameZh: "东京", country: "Japan", countryZh: "日本", coordinate: [139.6917, 35.6895], type: "city", value: 142, priority: 82 },
  { id: "singapore", name: "Singapore", nameZh: "新加坡", country: "Singapore", countryZh: "新加坡", coordinate: [103.8198, 1.3521], type: "port", value: 196, priority: 92 },
  { id: "bangkok", name: "Bangkok", nameZh: "曼谷", country: "Thailand", countryZh: "泰国", coordinate: [100.5018, 13.7563], type: "city", value: 128, priority: 76 },
  { id: "kuala-lumpur", name: "Kuala Lumpur", nameZh: "吉隆坡", country: "Malaysia", countryZh: "马来西亚", coordinate: [101.6869, 3.139], type: "city", value: 118, priority: 72 },
  { id: "manila", name: "Manila", nameZh: "马尼拉", country: "Philippines", countryZh: "菲律宾", coordinate: [120.9842, 14.5995], type: "port", value: 112, priority: 70 },
  { id: "jakarta", name: "Jakarta", nameZh: "雅加达", country: "Indonesia", countryZh: "印度尼西亚", coordinate: [106.8456, -6.2088], type: "port", value: 126, priority: 74 },
  { id: "new-delhi", name: "New Delhi", nameZh: "新德里", country: "India", countryZh: "印度", coordinate: [77.209, 28.6139], type: "city", value: 116, priority: 68 },
  { id: "dubai", name: "Dubai", nameZh: "迪拜", country: "United Arab Emirates", countryZh: "阿联酋", coordinate: [55.2708, 25.2048], type: "hub", value: 154, priority: 84 },
  { id: "nairobi", name: "Nairobi", nameZh: "内罗毕", country: "Kenya", countryZh: "肯尼亚", coordinate: [36.8219, -1.2921], type: "city", value: 86, priority: 60 },
  { id: "moscow", name: "Moscow", nameZh: "莫斯科", country: "Russia", countryZh: "俄罗斯", coordinate: [37.6173, 55.7558], type: "city", value: 102, priority: 64 },
  { id: "paris", name: "Paris", nameZh: "巴黎", country: "France", countryZh: "法国", coordinate: [2.3522, 48.8566], type: "city", value: 108, priority: 66 },
  { id: "london", name: "London", nameZh: "伦敦", country: "United Kingdom", countryZh: "英国", coordinate: [-0.1276, 51.5072], type: "city", value: 114, priority: 69 },
  { id: "sydney", name: "Sydney", nameZh: "悉尼", country: "Australia", countryZh: "澳大利亚", coordinate: [151.2093, -33.8688], type: "port", value: 104, priority: 67 },
  { id: "auckland", name: "Auckland", nameZh: "奥克兰", country: "New Zealand", countryZh: "新西兰", coordinate: [174.7633, -36.8485], type: "port", value: 82, priority: 58 },
  { id: "los-angeles", name: "Los Angeles", nameZh: "洛杉矶", country: "United States", countryZh: "美国", coordinate: [-118.2437, 34.0522], type: "port", value: 98, priority: 62 },
])
