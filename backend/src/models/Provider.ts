import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

type ProviderType = 'cardiothoracic_surgeon' | 'cardiologist' | 'electrophysiologist' | 'general_practitioner' | 'physical_therapist' | 'pharmacy' | 'hospital' | 'other';
type PreferredContactMethod = 'phone' | 'email' | 'portal' | 'any';

interface ProviderAttributes {
  id: number;
  userId: number;
  name: string;
  speCAIlty?: string;
  providerType?: ProviderType;
  phone?: string;
  email?: string;
  address?: string;
  nextAppointment?: Date;
  notes?: string;
  isPrimary: boolean;
  officeHours?: string;
  faxNumber?: string;
  patientPortalUrl?: string;
  preferredContactMethod?: PreferredContactMethod;
  acceptedInsurance?: string;
  lastVisitDate?: Date;
  isEmergencyContact: boolean;
  pharmacyLicenseNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProviderCreationAttributes extends Optional<ProviderAttributes, 'id' | 'speCAIlty' | 'providerType' | 'phone' | 'email' | 'address' | 'nextAppointment' | 'notes' | 'isPrimary' | 'officeHours' | 'faxNumber' | 'patientPortalUrl' | 'preferredContactMethod' | 'acceptedInsurance' | 'lastVisitDate' | 'isEmergencyContact' | 'pharmacyLicenseNumber' | 'createdAt' | 'updatedAt'> {}

class Provider extends Model<ProviderAttributes, ProviderCreationAttributes> implements ProviderAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public speCAIlty?: string;
  public providerType?: ProviderType;
  public phone?: string;
  public email?: string;
  public address?: string;
  public nextAppointment?: Date;
  public notes?: string;
  public isPrimary!: boolean;
  public officeHours?: string;
  public faxNumber?: string;
  public patientPortalUrl?: string;
  public preferredContactMethod?: PreferredContactMethod;
  public acceptedInsurance?: string;
  public lastVisitDate?: Date;
  public isEmergencyContact!: boolean;
  public pharmacyLicenseNumber?: string;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  static initialize() {
    Provider.init(
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        speCAIlty: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        nextAppointment: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isPrimary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        providerType: {
          type: DataTypes.ENUM('cardiothoracic_surgeon', 'cardiologist', 'electrophysiologist', 'general_practitioner', 'physical_therapist', 'pharmacy', 'hospital', 'other'),
          allowNull: true,
        },
        officeHours: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        faxNumber: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        patientPortalUrl: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        preferredContactMethod: {
          type: DataTypes.ENUM('phone', 'email', 'portal', 'any'),
          allowNull: true,
          defaultValue: 'phone',
        },
        acceptedInsurance: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lastVisitDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isEmergencyContact: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        pharmacyLicenseNumber: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'Provider',
        tableName: 'providers',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    Provider.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

Provider.initialize();

export default Provider;
