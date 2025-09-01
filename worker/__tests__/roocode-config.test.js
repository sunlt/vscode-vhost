const { RooCodeSettings } = require('../modules/roocode-config');

describe('roocode-config模块测试', () => {
  describe('RooCodeSettings类', () => {
    test('应该能够创建RooCodeSettings实例', () => {
      const settings = new RooCodeSettings();
      expect(settings).toBeInstanceOf(RooCodeSettings);
    });

    test('应该有默认值', () => {
      const settings = new RooCodeSettings();
      
      expect(settings.apiProvider).toBe('openai');
      expect(settings.openAiModelId).toBe('gpt-4-turbo');
      expect(settings.modelTemperature).toBe(0.7);
      expect(settings.modelMaxTokens).toBe(4000);
      expect(Array.isArray(settings.allowedCommands)).toBe(true);
      expect(Array.isArray(settings.deniedCommands)).toBe(true);
      expect(settings.alwaysAllowExecute).toBe(false);
      expect(settings.alwaysAllowWrite).toBe(false);
      expect(settings.alwaysAllowReadOnly).toBe(true);
      expect(settings.alwaysAllowBrowser).toBe(false);
      expect(settings.alwaysAllowSubtasks).toBe(false);
      expect(settings.customInstructions).toBe('You are a helpful assistant.');
      expect(settings.diffEnabled).toBe(true);
      expect(settings.enableCheckpoints).toBe(false);
      expect(settings.writeDelayMs).toBe(500);
      expect(settings.terminalOutputLineLimit).toBe(100);
      expect(settings.language).toBe('en');
    });

    test('应该能够使用自定义值创建实例', () => {
      const customSettings = {
        apiProvider: 'anthropic',
        anthropicApiKey: 'test-key',
        apiModelId: 'claude-3-opus-20240229',
        modelTemperature: 0.5,
        modelMaxTokens: 8000,
        allowedCommands: ['git', 'npm'],
        deniedCommands: ['rm', 'sudo'],
        alwaysAllowExecute: true,
        alwaysAllowWrite: true,
        alwaysAllowReadOnly: false,
        alwaysAllowBrowser: true,
        alwaysAllowSubtasks: true,
        customInstructions: 'Custom instructions',
        diffEnabled: false,
        enableCheckpoints: true,
        writeDelayMs: 1000,
        terminalOutputLineLimit: 200,
        language: 'zh'
      };
      
      const settings = new RooCodeSettings(customSettings);
      
      expect(settings.apiProvider).toBe(customSettings.apiProvider);
      expect(settings.anthropicApiKey).toBe(customSettings.anthropicApiKey);
      expect(settings.apiModelId).toBe(customSettings.apiModelId);
      expect(settings.modelTemperature).toBe(customSettings.modelTemperature);
      expect(settings.modelMaxTokens).toBe(customSettings.modelMaxTokens);
      expect(settings.allowedCommands).toEqual(customSettings.allowedCommands);
      expect(settings.deniedCommands).toEqual(customSettings.deniedCommands);
      expect(settings.alwaysAllowExecute).toBe(customSettings.alwaysAllowExecute);
      expect(settings.alwaysAllowWrite).toBe(customSettings.alwaysAllowWrite);
      expect(settings.alwaysAllowReadOnly).toBe(customSettings.alwaysAllowReadOnly);
      expect(settings.alwaysAllowBrowser).toBe(customSettings.alwaysAllowBrowser);
      expect(settings.alwaysAllowSubtasks).toBe(customSettings.alwaysAllowSubtasks);
      expect(settings.customInstructions).toBe(customSettings.customInstructions);
      expect(settings.diffEnabled).toBe(customSettings.diffEnabled);
      expect(settings.enableCheckpoints).toBe(customSettings.enableCheckpoints);
      expect(settings.writeDelayMs).toBe(customSettings.writeDelayMs);
      expect(settings.terminalOutputLineLimit).toBe(customSettings.terminalOutputLineLimit);
      expect(settings.language).toBe(customSettings.language);
    });
  });

  describe('配置验证', () => {
    test('应该验证modelTemperature范围', () => {
      expect(() => {
        new RooCodeSettings({ modelTemperature: -0.1 });
      }).toThrow('modelTemperature must be between 0 and 1');
      
      expect(() => {
        new RooCodeSettings({ modelTemperature: 1.1 });
      }).toThrow('modelTemperature must be between 0 and 1');
      
      expect(() => {
        new RooCodeSettings({ modelTemperature: 0.5 });
      }).not.toThrow();
    });

    test('应该验证modelMaxTokens范围', () => {
      expect(() => {
        new RooCodeSettings({ modelMaxTokens: 0 });
      }).toThrow('modelMaxTokens must be greater than 0');
      
      expect(() => {
        new RooCodeSettings({ modelMaxTokens: 100000 });
      }).not.toThrow();
    });

    test('应该验证allowedCommands类型', () => {
      expect(() => {
        new RooCodeSettings({ allowedCommands: 'git' });
      }).toThrow('allowedCommands must be an array');
      
      expect(() => {
        new RooCodeSettings({ allowedCommands: ['git', 'npm'] });
      }).not.toThrow();
    });

    test('应该验证deniedCommands类型', () => {
      expect(() => {
        new RooCodeSettings({ deniedCommands: 'rm' });
      }).toThrow('deniedCommands must be an array');
      
      expect(() => {
        new RooCodeSettings({ deniedCommands: ['rm', 'sudo'] });
      }).not.toThrow();
    });

    test('应该验证布尔类型配置', () => {
      expect(() => {
        new RooCodeSettings({ alwaysAllowExecute: 'true' });
      }).toThrow('alwaysAllowExecute must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ alwaysAllowWrite: 'false' });
      }).toThrow('alwaysAllowWrite must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ alwaysAllowReadOnly: 'true' });
      }).toThrow('alwaysAllowReadOnly must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ alwaysAllowBrowser: 'false' });
      }).toThrow('alwaysAllowBrowser must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ alwaysAllowSubtasks: 'true' });
      }).toThrow('alwaysAllowSubtasks must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ diffEnabled: 'false' });
      }).toThrow('diffEnabled must be a boolean');
      
      expect(() => {
        new RooCodeSettings({ enableCheckpoints: 'true' });
      }).toThrow('enableCheckpoints must be a boolean');
      
      expect(() => {
        new RooCodeSettings({
          alwaysAllowExecute: true,
          alwaysAllowWrite: false,
          alwaysAllowReadOnly: true,
          alwaysAllowBrowser: false,
          alwaysAllowSubtasks: true,
          diffEnabled: false,
          enableCheckpoints: true
        });
      }).not.toThrow();
    });

    test('应该验证writeDelayMs范围', () => {
      expect(() => {
        new RooCodeSettings({ writeDelayMs: -1 });
      }).toThrow('writeDelayMs must be greater than or equal to 0');
      
      expect(() => {
        new RooCodeSettings({ writeDelayMs: 10000 });
      }).not.toThrow();
    });

    test('应该验证terminalOutputLineLimit范围', () => {
      expect(() => {
        new RooCodeSettings({ terminalOutputLineLimit: 0 });
      }).toThrow('terminalOutputLineLimit must be greater than 0');
      
      expect(() => {
        new RooCodeSettings({ terminalOutputLineLimit: 1000 });
      }).not.toThrow();
    });

    test('应该验证apiProvider值', () => {
      expect(() => {
        new RooCodeSettings({ apiProvider: 'invalid-provider' });
      }).toThrow('apiProvider must be one of: openai, anthropic, google');
      
      expect(() => {
        new RooCodeSettings({ apiProvider: 'openai' });
      }).not.toThrow();
      
      expect(() => {
        new RooCodeSettings({ apiProvider: 'anthropic' });
      }).not.toThrow();
      
      expect(() => {
        new RooCodeSettings({ apiProvider: 'google' });
      }).not.toThrow();
    });

    test('应该验证language值', () => {
      expect(() => {
        new RooCodeSettings({ language: 'invalid-lang' });
      }).toThrow('language must be one of: en, zh');
      
      expect(() => {
        new RooCodeSettings({ language: 'en' });
      }).not.toThrow();
      
      expect(() => {
        new RooCodeSettings({ language: 'zh' });
      }).not.toThrow();
    });
  });

  describe('配置合并', () => {
    test('应该能够合并配置', () => {
      const settings1 = new RooCodeSettings({
        apiProvider: 'openai',
        modelTemperature: 0.7,
        allowedCommands: ['git', 'npm']
      });
      
      const settings2 = new RooCodeSettings({
        modelTemperature: 0.5,
        allowedCommands: ['node'],
        deniedCommands: ['rm']
      });
      
      const merged = settings1.merge(settings2);
      
      expect(merged.apiProvider).toBe('openai');
      expect(merged.modelTemperature).toBe(0.5);
      expect(merged.allowedCommands).toEqual(['node']);
      expect(merged.deniedCommands).toEqual(['rm']);
    });

    test('应该能够深度合并配置', () => {
      const settings1 = new RooCodeSettings({
        nested: {
          prop1: 'value1',
          prop2: 'value2'
        }
      });
      
      const settings2 = new RooCodeSettings({
        nested: {
          prop2: 'updated value2',
          prop3: 'value3'
        }
      });
      
      const merged = settings1.merge(settings2);
      
      expect(merged.nested.prop1).toBe('value1');
      expect(merged.nested.prop2).toBe('updated value2');
      expect(merged.nested.prop3).toBe('value3');
    });
  });

  describe('配置克隆', () => {
    test('应该能够克隆配置', () => {
      const original = new RooCodeSettings({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      const cloned = original.clone();
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('配置序列化', () => {
    test('应该能够序列化配置', () => {
      const settings = new RooCodeSettings({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      const serialized = settings.serialize();
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      
      const parsed = JSON.parse(serialized);
      expect(parsed.apiProvider).toBe('anthropic');
      expect(parsed.modelTemperature).toBe(0.5);
      expect(parsed.allowedCommands).toEqual(['git', 'npm']);
    });

    test('应该能够反序列化配置', () => {
      const configData = {
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      };
      
      const serialized = JSON.stringify(configData);
      const settings = RooCodeSettings.deserialize(serialized);
      
      expect(settings).toBeInstanceOf(RooCodeSettings);
      expect(settings.apiProvider).toBe(configData.apiProvider);
      expect(settings.modelTemperature).toBe(configData.modelTemperature);
      expect(settings.allowedCommands).toEqual(configData.allowedCommands);
    });
  });

  describe('配置验证方法', () => {
    test('应该能够验证配置', () => {
      const settings = new RooCodeSettings();
      
      expect(settings.isValid()).toBe(true);
      
      const invalidSettings = new RooCodeSettings({ modelTemperature: 1.5 });
      
      expect(invalidSettings.isValid()).toBe(false);
    });

    test('应该能够获取验证错误', () => {
      const invalidSettings = new RooCodeSettings({ modelTemperature: 1.5 });
      
      const errors = invalidSettings.getValidationErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('modelTemperature must be between 0 and 1');
    });

    test('应该能够验证多个错误', () => {
      const invalidSettings = new RooCodeSettings({
        modelTemperature: 1.5,
        allowedCommands: 'git',
        alwaysAllowExecute: 'true'
      });
      
      const errors = invalidSettings.getValidationErrors();
      
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(error => error.includes('modelTemperature'))).toBe(true);
      expect(errors.some(error => error.includes('allowedCommands'))).toBe(true);
      expect(errors.some(error => error.includes('alwaysAllowExecute'))).toBe(true);
    });
  });

  describe('配置重置', () => {
    test('应该能够重置为默认值', () => {
      const settings = new RooCodeSettings({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      settings.reset();
      
      expect(settings.apiProvider).toBe('openai');
      expect(settings.modelTemperature).toBe(0.7);
      expect(settings.allowedCommands).toEqual(['git', 'npm', 'node']);
    });
  });

  describe('配置更新', () => {
    test('应该能够更新配置', () => {
      const settings = new RooCodeSettings();
      
      settings.update({
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      expect(settings.modelTemperature).toBe(0.5);
      expect(settings.allowedCommands).toEqual(['git', 'npm']);
      expect(settings.apiProvider).toBe('openai'); // 未更改的值应保持不变
    });

    test('应该拒绝无效的更新', () => {
      const settings = new RooCodeSettings();
      
      expect(() => {
        settings.update({ modelTemperature: 1.5 });
      }).toThrow('modelTemperature must be between 0 and 1');
      
      // 验证配置未被更改
      expect(settings.modelTemperature).toBe(0.7);
    });
  });

  describe('配置差异', () => {
    test('应该能够计算配置差异', () => {
      const settings1 = new RooCodeSettings({
        apiProvider: 'openai',
        modelTemperature: 0.7,
        allowedCommands: ['git', 'npm', 'node']
      });
      
      const settings2 = new RooCodeSettings({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      const diff = settings1.diff(settings2);
      
      expect(diff).toEqual({
        apiProvider: { from: 'openai', to: 'anthropic' },
        modelTemperature: { from: 0.7, to: 0.5 },
        allowedCommands: { from: ['git', 'npm', 'node'], to: ['git', 'npm'] }
      });
    });

    test('应该能够处理无差异的情况', () => {
      const settings1 = new RooCodeSettings();
      const settings2 = new RooCodeSettings();
      
      const diff = settings1.diff(settings2);
      
      expect(Object.keys(diff)).toHaveLength(0);
    });
  });

  describe('配置导出', () => {
    test('应该能够导出配置为对象', () => {
      const settings = new RooCodeSettings({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm']
      });
      
      const exported = settings.toObject();
      
      expect(exported).toEqual({
        apiProvider: 'anthropic',
        modelTemperature: 0.5,
        allowedCommands: ['git', 'npm'],
        // 其他默认属性
        openAiModelId: 'gpt-4-turbo',
        modelMaxTokens: 4000,
        deniedCommands: ['rm', 'sudo'],
        alwaysAllowExecute: false,
        alwaysAllowWrite: false,
        alwaysAllowReadOnly: true,
        alwaysAllowBrowser: false,
        alwaysAllowSubtasks: false,
        customInstructions: 'You are a helpful assistant.',
        diffEnabled: true,
        enableCheckpoints: false,
        writeDelayMs: 500,
        terminalOutputLineLimit: 100,
        language: 'en'
      });
    });
  });
});