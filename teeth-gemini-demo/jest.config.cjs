/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/.*\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/test/__mocks__/fileMock.cjs',
    '^@/assets/glb/.*\\.glb\\?url$': '<rootDir>/test/__mocks__/fileMock.cjs',
    '^@/api/teethConfig$': '<rootDir>/src/test-utils/mocks/teethConfig.ts',
    '^@/api/geminiConfig$': '<rootDir>/src/test-utils/mocks/geminiConfig.ts',
    '^@/api/openaiConfig$': '<rootDir>/src/test-utils/mocks/openaiConfig.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/test/__mocks__/fileMock.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).[tj]s?(x)'],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};
