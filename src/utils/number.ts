export const toSafeNumber = (value: string | number | undefined, fallback = 0) => {
  // 将输入值安全转换为数字，转换失败时回退默认值。
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
