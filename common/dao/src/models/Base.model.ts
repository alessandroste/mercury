export default abstract class Base {
  public id!: string;

  public asJSON(): string {
    return JSON.stringify(
      this,
      (_key, value) => {
        if (value instanceof Set) {
          return [...value];
        } else if (value instanceof Function) {
          return undefined;
        }
        return value;
      }
    );
  }
}
