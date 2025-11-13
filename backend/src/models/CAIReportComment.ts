import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

type CommentType = 'feedback' | 'approval' | 'concern' | 'recommendation' | 'question';

interface CIAReportCommentAttributes {
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

interface CIAReportCommentCreationAttributes extends Optional<CIAReportCommentAttributes, 'id' | 'commentType' | 'isPrivate'> {}

class CIAReportComment extends Model<CIAReportCommentAttributes, CIAReportCommentCreationAttributes> implements CIAReportCommentAttributes {
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
    CIAReportComment.init(
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
            model: 'cia_reports',
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
        modelName: 'CIAReportComment',
        tableName: 'cia_report_comments',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    CIAReportComment.belongsTo(models.CIAReport, { foreignKey: 'reportId', as: 'report' });
    CIAReportComment.belongsTo(models.Provider, { foreignKey: 'providerId', as: 'provider' });
    CIAReportComment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

CIAReportComment.initialize();

export default CIAReportComment;
