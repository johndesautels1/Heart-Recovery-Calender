import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

type CommentType = 'feedback' | 'approval' | 'concern' | 'recommendation' | 'question';

interface CAIReportCommentAttributes {
  id: number;
  reportId: number;
  providerId: number;
  userId: number;
  comment: string;
  commentType: CommentType;
  isPrivate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CAIReportCommentCreationAttributes extends Optional<CAIReportCommentAttributes, 'id' | 'commentType' | 'isPrivate'> {}

class CAIReportComment extends Model<CAIReportCommentAttributes, CAIReportCommentCreationAttributes> implements CAIReportCommentAttributes {
  public id!: number;
  public reportId!: number;
  public providerId!: number;
  public userId!: number;
  public comment!: string;
  public commentType!: CommentType;
  public isPrivate!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    CAIReportComment.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        reportId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'CAI_reports',
            key: 'id',
          },
        },
        providerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'providers',
            key: 'id',
          },
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        commentType: {
          type: DataTypes.ENUM('feedback', 'approval', 'concern', 'recommendation', 'question'),
          allowNull: false,
          defaultValue: 'feedback',
        },
        isPrivate: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: 'CAIReportComment',
        tableName: 'cai_report_comments',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    CAIReportComment.belongsTo(models.CAIReport, { foreignKey: 'reportId', as: 'report' });
    CAIReportComment.belongsTo(models.Provider, { foreignKey: 'providerId', as: 'provider' });
    CAIReportComment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

CAIReportComment.initialize();

export default CAIReportComment;
