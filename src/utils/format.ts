export const formatSignedNumber = (value: number, digits = 2) => {
  // 将数值格式化为带符号文本。
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

export const formatPercent = (value: number, digits = 2) => {
  // 将比例格式化为带符号百分比文本。
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`
}

export const formatYmd = (date: Date) => {
  // 输出 YYYY-MM-DD 日期字符串。
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatMonthDayZh = (date: Date) => {
  // 输出 MM月DD日 日期字符串。
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}月${day}日`
}

export const formatYearMonthDayZh = (date: Date) => {
  // 输出 YYYY年MM月DD日 日期字符串。
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}年${month}月${day}日`
}

export const formatMonthDayWeekZh = (date: Date) => {
  // 输出 MM月DD日(周X) 日期字符串。
  const weekNames = ['日', '一', '二', '三', '四', '五', '六']
  return `${formatMonthDayZh(date)}(周${weekNames[date.getDay()]})`
}
