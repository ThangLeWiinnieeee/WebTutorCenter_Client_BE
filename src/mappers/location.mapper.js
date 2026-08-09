class LocationMapper {
  static toProvinceDTO(province) {
    if (!province) return null;
    return {
      _id: province._id,
      code: province.code,
      name: province.name,
      codename: province.codename,
      divisionType: province.divisionType,
      phoneCode: province.phoneCode,
      __v: province.__v,
    };
  }

  static toDistrictDTO(district) {
    if (!district) return null;
    return {
      _id: district._id,
      code: district.code,
      name: district.name,
      codename: district.codename,
      divisionType: district.divisionType,
      provinceCode: district.provinceCode,
      __v: district.__v,
    };
  }

  static toSchoolDTO(school) {
    if (!school) return null;
    return {
      _id: school._id,
      name: school.name,
      nameSearch: school.nameSearch,
      shortName: school.shortName,
      type: school.type,
      provinceCode: school.provinceCode,
      __v: school.__v,
    };
  }

  static toProvinceDTOs(provinces = []) {
    return provinces.map(LocationMapper.toProvinceDTO);
  }

  static toDistrictDTOs(districts = []) {
    return districts.map(LocationMapper.toDistrictDTO);
  }

  static toSchoolDTOs(schools = []) {
    return schools.map(LocationMapper.toSchoolDTO);
  }
}

module.exports = LocationMapper;
