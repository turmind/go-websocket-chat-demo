/**
 * Unit Tests for Avatar Generator
 * Tests the AvatarGenerator class functionality including avatar generation, caching, and rendering
 */

describe('Avatar Generator', () => {
  
  let avatarGenerator;
  
  // Setup before each test
  beforeEach = () => {
    avatarGenerator = new AvatarGenerator();
  };

  it('should initialize with default properties', () => {
    const generator = new AvatarGenerator();
    
    assertInstanceOf(generator.avatarCache, Map, 'Avatar cache should be a Map');
    assertInstanceOf(generator.colorPalette, Array, 'Color palette should be an array');
    assertInstanceOf(generator.presetAvatars, Array, 'Preset avatars should be an array');
    assert(generator.colorPalette.length > 0, 'Color palette should not be empty');
    assert(generator.presetAvatars.length > 0, 'Preset avatars should not be empty');
  });

  it('should generate initial avatar correctly', () => {
    const generator = new AvatarGenerator();
    const avatar = generator.generateInitialAvatar('TestUser');
    
    assertEqual(avatar.type, 'initial', 'Avatar type should be initial');
    assertEqual(avatar.initial, 'T', 'Initial should be first letter uppercase');
    assertType(avatar.backgroundColor, 'string', 'Background color should be a string');
    assertEqual(avatar.textColor, '#ffffff', 'Text color should be white');
    assert(avatar.backgroundColor.startsWith('#'), 'Background color should be a hex color');
  });

  it('should handle Chinese characters in initial generation', () => {
    const generator = new AvatarGenerator();
    const avatar = generator.generateInitialAvatar('张三');
    
    assertEqual(avatar.initial, '张', 'Should use Chinese character as initial');
    assertType(avatar.backgroundColor, 'string', 'Should have background color');
  });

  it('should handle empty username gracefully', () => {
    const generator = new AvatarGenerator();
    const avatar1 = generator.generateInitialAvatar('');
    const avatar2 = generator.generateInitialAvatar(null);
    const avatar3 = generator.generateInitialAvatar(undefined);
    
    assertEqual(avatar1.initial, '?', 'Empty string should default to ?');
    assertEqual(avatar2.initial, '?', 'Null should default to ?');
    assertEqual(avatar3.initial, '?', 'Undefined should default to ?');
  });

  it('should generate consistent colors for same username', () => {
    const generator = new AvatarGenerator();
    const avatar1 = generator.generateInitialAvatar('TestUser');
    const avatar2 = generator.generateInitialAvatar('TestUser');
    
    assertEqual(avatar1.backgroundColor, avatar2.backgroundColor, 'Same username should generate same color');
  });

  it('should generate different colors for different usernames', () => {
    const generator = new AvatarGenerator();
    const avatar1 = generator.generateInitialAvatar('User1');
    const avatar2 = generator.generateInitialAvatar('User2');
    
    // Note: This might occasionally fail due to hash collisions, but very unlikely
    assert(avatar1.backgroundColor !== avatar2.backgroundColor, 'Different usernames should likely generate different colors');
  });

  it('should generate preset avatar correctly', () => {
    const generator = new AvatarGenerator();
    const presetId = generator.presetAvatars[1].id; // Skip default
    const avatar = generator.generatePresetAvatar('TestUser', presetId);
    
    assertEqual(avatar.type, 'preset', 'Avatar type should be preset');
    assertType(avatar.emoji, 'string', 'Should have emoji');
    assertEqual(avatar.backgroundColor, '#f8f9fa', 'Should have light background');
    assertEqual(avatar.textColor, '#212529', 'Should have dark text');
  });

  it('should fallback to initial avatar for invalid preset', () => {
    const generator = new AvatarGenerator();
    const avatar = generator.generatePresetAvatar('TestUser', 'invalid-preset');
    
    assertEqual(avatar.type, 'initial', 'Should fallback to initial avatar');
    assertEqual(avatar.initial, 'T', 'Should generate initial correctly');
  });

  it('should generate custom emoji avatar correctly', () => {
    const generator = new AvatarGenerator();
    const avatar = generator.generateCustomAvatar('TestUser', '😀');
    
    assertEqual(avatar.type, 'custom', 'Avatar type should be custom');
    assertEqual(avatar.emoji, '😀', 'Should preserve emoji');
    assertEqual(avatar.backgroundColor, '#f8f9fa', 'Should have light background');
  });

  it('should generate custom image avatar correctly', () => {
    const generator = new AvatarGenerator();
    const imageUrl = 'https://example.com/avatar.jpg';
    const avatar = generator.generateCustomAvatar('TestUser', imageUrl);
    
    assertEqual(avatar.type, 'custom', 'Avatar type should be custom');
    assertEqual(avatar.imageUrl, imageUrl, 'Should preserve image URL');
    assertEqual(avatar.backgroundColor, '#f8f9fa', 'Should have light background');
  });

  it('should fallback to initial for invalid custom avatar', () => {
    const generator = new AvatarGenerator();
    const avatar = generator.generateCustomAvatar('TestUser', null);
    
    assertEqual(avatar.type, 'initial', 'Should fallback to initial avatar');
    assertEqual(avatar.initial, 'T', 'Should generate initial correctly');
  });

  it('should cache avatars correctly', () => {
    const generator = new AvatarGenerator();
    
    const avatar1 = generator.generateAvatar('TestUser', 'initial');
    const avatar2 = generator.generateAvatar('TestUser', 'initial');
    
    assert(avatar1 === avatar2, 'Should return cached avatar instance');
    assert(generator.avatarCache.size > 0, 'Cache should contain entries');
  });

  it('should generate different cache keys for different parameters', () => {
    const generator = new AvatarGenerator();
    
    generator.generateAvatar('TestUser', 'initial');
    generator.generateAvatar('TestUser', 'preset', 'avatar1');
    generator.generateAvatar('DifferentUser', 'initial');
    
    assert(generator.avatarCache.size >= 3, 'Should cache different parameter combinations separately');
  });

  it('should detect Chinese characters correctly', () => {
    const generator = new AvatarGenerator();
    
    assertTruthy(generator.isChinese('张'), 'Should detect Chinese character');
    assertTruthy(generator.isChinese('李'), 'Should detect Chinese character');
    assertFalsy(generator.isChinese('A'), 'Should not detect English letter as Chinese');
    assertFalsy(generator.isChinese('1'), 'Should not detect number as Chinese');
  });

  it('should detect emojis correctly', () => {
    const generator = new AvatarGenerator();
    
    assertTruthy(generator.isEmoji('😀'), 'Should detect emoji');
    assertTruthy(generator.isEmoji('🎯'), 'Should detect emoji');
    assertFalsy(generator.isEmoji('A'), 'Should not detect letter as emoji');
    assertFalsy(generator.isEmoji('123'), 'Should not detect number as emoji');
  });

  it('should get initial correctly for various inputs', () => {
    const generator = new AvatarGenerator();
    
    assertEqual(generator.getInitial('TestUser'), 'T', 'Should get first letter');
    assertEqual(generator.getInitial('张三'), '张', 'Should get Chinese character');
    assertEqual(generator.getInitial('123abc'), '1', 'Should get first character even if number');
    assertEqual(generator.getInitial(''), '?', 'Should default to ? for empty string');
    assertEqual(generator.getInitial(null), '?', 'Should default to ? for null');
  });

  it('should create avatar HTML correctly for initial avatar', () => {
    const generator = new AvatarGenerator();
    const avatar = { type: 'initial', initial: 'T', backgroundColor: '#007bff', textColor: '#ffffff' };
    
    const html = generator.createAvatarHTML(avatar);
    
    assertType(html, 'string', 'Should return HTML string');
    assert(html.includes('T'), 'Should contain initial');
    assert(html.includes('#007bff'), 'Should contain background color');
    assert(html.includes('#ffffff'), 'Should contain text color');
    assert(html.includes('class="avatar"'), 'Should have avatar class');
  });

  it('should create avatar HTML correctly for emoji avatar', () => {
    const generator = new AvatarGenerator();
    const avatar = { type: 'preset', emoji: '😀', backgroundColor: '#f8f9fa', textColor: '#212529' };
    
    const html = generator.createAvatarHTML(avatar);
    
    assert(html.includes('😀'), 'Should contain emoji');
    assert(html.includes('#f8f9fa'), 'Should contain background color');
  });

  it('should create avatar HTML correctly for image avatar', () => {
    const generator = new AvatarGenerator();
    const avatar = { type: 'custom', imageUrl: 'https://example.com/avatar.jpg', backgroundColor: '#f8f9fa' };
    
    const html = generator.createAvatarHTML(avatar);
    
    assert(html.includes('https://example.com/avatar.jpg'), 'Should contain image URL');
    assert(html.includes('background-image'), 'Should use background-image style');
  });

  it('should handle different avatar sizes', () => {
    const generator = new AvatarGenerator();
    const avatar = { type: 'initial', initial: 'T', backgroundColor: '#007bff', textColor: '#ffffff' };
    
    const htmlSm = generator.createAvatarHTML(avatar, 'sm');
    const htmlMd = generator.createAvatarHTML(avatar, 'md');
    const htmlLg = generator.createAvatarHTML(avatar, 'lg');
    
    assert(htmlSm.includes('avatar-sm'), 'Small avatar should have size class');
    assert(!htmlMd.includes('avatar-md'), 'Medium avatar should not have size class (default)');
    assert(htmlLg.includes('avatar-lg'), 'Large avatar should have size class');
  });

  it('should clear cache correctly', () => {
    const generator = new AvatarGenerator();
    
    generator.generateAvatar('TestUser', 'initial');
    assert(generator.avatarCache.size > 0, 'Cache should have entries');
    
    generator.clearCache();
    assertEqual(generator.avatarCache.size, 0, 'Cache should be empty after clearing');
  });

  it('should get preset avatars correctly', () => {
    const generator = new AvatarGenerator();
    const presets = generator.getPresetAvatars();
    
    assertInstanceOf(presets, Array, 'Should return an array');
    assert(presets.length > 0, 'Should have preset avatars');
    assert(presets[0].id === 'default', 'First preset should be default');
  });

  it('should handle color generation edge cases', () => {
    const generator = new AvatarGenerator();
    
    const color1 = generator.getColorForName('');
    const color2 = generator.getColorForName(null);
    const color3 = generator.getColorForName(undefined);
    
    assertType(color1, 'string', 'Should return string for empty name');
    assertType(color2, 'string', 'Should return string for null name');
    assertType(color3, 'string', 'Should return string for undefined name');
    
    assert(color1.startsWith('#'), 'Should return valid hex color');
    assert(color2.startsWith('#'), 'Should return valid hex color');
    assert(color3.startsWith('#'), 'Should return valid hex color');
  });

});