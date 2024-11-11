export class Channel {
  id: string;
  name: string;
  description: string;
  userIds: any [];
  createdBy: string;

  constructor(obj?: any) {
    this.id = obj?.id || '';
    this.name = obj?.name || '';
    this.description = obj?.description || '';
    this.userIds = obj?.userIds || '';
    this.createdBy = obj?.createdBy || '';
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      userIds: this.userIds,
      createdBy: this.createdBy
    };
  }
}
