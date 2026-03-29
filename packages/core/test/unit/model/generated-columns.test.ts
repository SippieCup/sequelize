import { DataTypes, sql } from '@sequelize/core';
import { expect } from 'chai';
import { getTestDialect, getTestDialectClass, sequelize } from '../../support';

const dialectName = getTestDialect();

describe('Model - Generated Columns (unit)', () => {
  describe('validation', () => {
    it('rejects generatedAs without a type', () => {
      expect(() => {
        sequelize.define('Test', {
          fullName: {
            // @ts-expect-error -- testing missing type
            generatedAs: sql.literal("first_name || ' ' || last_name"),
            generatedColumn: 'STORED',
          },
        });
      }).to.throw();
    });

    it('rejects generatedAs with a defaultValue', () => {
      expect(() => {
        sequelize.define('Test', {
          fullName: {
            type: DataTypes.STRING,
            defaultValue: 'hello',
            generatedAs: sql.literal("first_name || ' ' || last_name"),
            generatedColumn: 'STORED',
          },
        });
      }).to.throw(/cannot have a defaultValue/i);
    });

    it('rejects generatedAs with autoIncrement', () => {
      expect(() => {
        sequelize.define('Test', {
          counter: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            generatedAs: sql.literal('id + 1'),
            generatedColumn: 'STORED',
          },
        });
      }).to.throw(/cannot be autoIncrement/i);
    });

    it('rejects generatedAs with a raw string (must use sql.literal)', () => {
      expect(() => {
        sequelize.define('Test', {
          fullName: {
            type: DataTypes.STRING,
            // @ts-expect-error -- testing that raw strings are rejected
            generatedAs: "first_name || ' ' || last_name",
            generatedColumn: 'STORED',
          },
        });
      }).to.throw(/must be a Literal/i);
    });

    if (dialectName === 'snowflake') {
      it('rejects generatedAs on dialects that do not support generated columns', () => {
        expect(() => {
          sequelize.define('Test', {
            fullName: {
              type: DataTypes.STRING,
              generatedAs: sql.literal("first_name || ' ' || last_name"),
              generatedColumn: 'STORED',
            },
          });
        }).to.throw(/does not support generated columns/i);
      });
    }

    if (
      dialectName === 'postgres' ||
      dialectName === 'mssql' ||
      dialectName === 'db2' ||
      dialectName === 'ibmi'
    ) {
      it('rejects VIRTUAL generated columns on dialects that only support STORED', () => {
        expect(() => {
          sequelize.define('Test', {
            fullName: {
              type: DataTypes.STRING,
              generatedAs: sql.literal("first_name || ' ' || last_name"),
              generatedColumn: 'VIRTUAL',
            },
          });
        }).to.throw(/does not support VIRTUAL generated columns/i);
      });
    }
  });

  describe('feature flags', () => {
    it('has generatedColumns support flags on the dialect', () => {
      const DialectClass = getTestDialectClass();
      const supports = DialectClass.supports;

      expect(supports).to.have.property('generatedColumns');
      expect(supports.generatedColumns).to.have.property('stored');
      expect(supports.generatedColumns).to.have.property('virtual');

      // Verify the flags are boolean
      expect(supports.generatedColumns.stored).to.be.a('boolean');
      expect(supports.generatedColumns.virtual).to.be.a('boolean');
    });

    // Per-dialect flag verification
    if (dialectName === 'postgres') {
      it('postgres supports STORED but not VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(false);
      });
    }

    if (dialectName === 'mysql') {
      it('mysql supports both STORED and VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(true);
      });
    }

    if (dialectName === 'mariadb') {
      it('mariadb supports both STORED and VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(true);
      });
    }

    if (dialectName === 'sqlite3') {
      it('sqlite3 supports both STORED and VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(true);
      });
    }

    if (dialectName === 'mssql') {
      it('mssql supports STORED (PERSISTED) but not VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(false);
      });
    }

    if (dialectName === 'db2') {
      it('db2 supports STORED but not VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(false);
      });
    }

    if (dialectName === 'ibmi') {
      it('ibmi supports STORED but not VIRTUAL generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(true);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(false);
      });
    }

    if (dialectName === 'snowflake') {
      it('snowflake does not support generated columns', () => {
        expect(sequelize.dialect.supports.generatedColumns.stored).to.equal(false);
        expect(sequelize.dialect.supports.generatedColumns.virtual).to.equal(false);
      });
    }
  });

  describe('model definition metadata', () => {
    if (dialectName === 'snowflake') {
      // Snowflake doesn't support generated columns, skip these tests
      return;
    }

    it('adds generated columns to readOnlyAttributeNames', () => {
      const TestModel = sequelize.define('Test', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        fullName: {
          type: DataTypes.STRING,
          generatedAs: sql.literal('"firstName" || \' \' || "lastName"'),
          generatedColumn: 'STORED',
        },
      });

      expect(TestModel.modelDefinition.readOnlyAttributeNames.has('fullName')).to.equal(true);
      // source columns should NOT be read-only
      expect(TestModel.modelDefinition.readOnlyAttributeNames.has('firstName')).to.equal(false);
      expect(TestModel.modelDefinition.readOnlyAttributeNames.has('lastName')).to.equal(false);
    });

    it('tracks generated columns in generatedAttributeNames', () => {
      const TestModel = sequelize.define('Test', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        fullName: {
          type: DataTypes.STRING,
          generatedAs: sql.literal('"firstName" || \' \' || "lastName"'),
          generatedColumn: 'STORED',
        },
      });

      expect(TestModel.modelDefinition.generatedAttributeNames.has('fullName')).to.equal(true);
      expect(TestModel.modelDefinition.generatedAttributeNames.has('firstName')).to.equal(false);
    });

    it('includes generated columns in physicalAttributes', () => {
      const TestModel = sequelize.define('Test', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        fullName: {
          type: DataTypes.STRING,
          generatedAs: sql.literal('"firstName" || \' \' || "lastName"'),
          generatedColumn: 'STORED',
        },
      });

      const physicalAttrNames = new Set(TestModel.modelDefinition.physicalAttributes.keys());

      // Generated columns DO exist in the DB as physical columns
      expect(physicalAttrNames.has('fullName')).to.equal(true);
    });

    it('defaults generatedColumn to STORED when only generatedAs is provided', () => {
      const TestModel = sequelize.define('Test', {
        firstName: DataTypes.STRING,
        total: {
          type: DataTypes.INTEGER,
          generatedAs: sql.literal('"firstName"'),
          // no generatedColumn specified — should default to STORED
        },
      });

      const attrs = TestModel.getAttributes();
      expect(attrs.total.generatedColumn).to.equal('STORED');
    });
  });
});
