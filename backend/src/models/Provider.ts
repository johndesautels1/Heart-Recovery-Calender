import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

interface ProviderAttributes {
  id: number;
  userId: number;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  address?: string;
  nextAppointment?: Date;
  notes?: string;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProviderCreationAttributes extends Optional<ProviderAttributes, 'id' | 'specialty' | 'phone' | 'email' | 'address' | 'nextAppointment' | 'notes' | 'isPrimary' | 'createdAt' | 'updatedAt'> {}

class Provider extends Model<ProviderAttributes, ProviderCreationAttributes> implements ProviderAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public specialty?: string;
  public phone?: string;
  public email?: string;
  public address?: string;
  public nextAppointment?: Date;
  public notes?: string;
  public isPrimary!: boolean;

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
        specialty: {
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
