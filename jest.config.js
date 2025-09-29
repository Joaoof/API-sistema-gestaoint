module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests__'], // removido '<rootDir>/test'
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: [
    '**/?(*.)+(spec|test).ts',
    '<rootDir>/tests__/architecture/**/?(*.)+(spec|test).ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
  },
};
