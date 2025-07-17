export default class GazRefDTO {
  constructor(model) {
    this.Период = model.Период;
    this.ДатаПлатежа = model.ДатаПлатежа;
    this.Объем = model.Объем;
    this.ОплатаПоступившая = model.ОплатаПоступившая;
    this.начисление = model.начисление;
  }
}
