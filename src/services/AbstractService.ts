export default class AbstractService {
  private static instance: AbstractService | undefined;

  private constructor() {}

  public static getInstance(): AbstractService {
    if (!AbstractService.instance) {
      AbstractService.instance = new AbstractService();
    }

    return AbstractService.instance;
  }
}
