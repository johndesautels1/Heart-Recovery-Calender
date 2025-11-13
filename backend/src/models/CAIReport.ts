import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

type ReportStatus = 'generating' | 'completed' | 'error';

interface CIAReportAttributes {
  id: number;
  userId: number;
  patientId?: number;
  generatedAt: Date;
  surgeryDate?: Date;
  analysisStartDate: Date;
  analysisEndDate: Date;
  daysPostSurgery?: number;
  recoveryScore?: number;
  reportData?: any;
  summary?: string;
  riskAssessment?: any;
  unusualFindings?: any;
  actionPlan?: any;
  dataCompleteness?: any;
  metricsAnalyzed?: any;
  aiModel?: string;
  aiPromptVersion?: string;
  status: ReportStatus;
  errorMessage?: string;
  sharedWithProviders: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CIAReportCreationAttributes extends Optional<CIAReportAttributes, 'id' | 'generatedAt' | 'status' | 'sharedWithProviders'> {}

class CIAReport extends Model<CIAReportAttributes, CIAReportCreationAttributes> implements CIAReportAttributes {
  public id!: number;
  public userId!: number;
  public patientId?: number;
  public generatedAt!: Date;
  public surgeryDate?: Date;
  public analysisStartDate!: Date;
  public analysisEndDate!: Date;
  public daysPostSurgery?: number;
  public recoveryScore?: number;
  public reportData?: any;
  public summary?: string;
  public riskAssessment?: any;
  public unusualFindings?: any;
  public actionPlan?: any;
  public dataCompleteness?: any;
  public metricsAnalyzed?: any;
  public aiModel?: string;
  public aiPromptVersion?: string;
  public status!: ReportStatus;
  public errorMessage?: string;
  public sharedWithProviders!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initialize() {
    CIAReport.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        patientId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'patients',
            key: 'id',
          },
        },
        generatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        surgeryDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        analysisStartDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        analysisEndDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        daysPostSurgery: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        recoveryScore: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        reportData: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        summary: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        riskAssessment: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        unusualFindings: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        actionPlan: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        dataCompleteness: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        metricsAnalyzed: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        aiModel: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        aiPromptVersion: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('generating', 'completed', 'error'),
          allowNull: false,
          defaultValue: 'generating',
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        sharedWithProviders: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'CIAReport',
        tableName: 'cia_reports',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    CIAReport.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    CIAReport.belongsTo(models.Patient, { foreignKey: 'patientId', as: 'patient' });
    CIAReport.hasMany(models.CIAReportComment, { foreignKey: 'reportId', as: 'comments' });
  }
}

CIAReport.initialize();

export default CIAReport;
