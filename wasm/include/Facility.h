#include <string>

#ifndef FACILITY_H
#define FACILITY_H
class Facility
{

public:
    /**
     * @brief
     *
     */
    Facility(){};
    Facility(
        std::string guid, std::string fiscalYear, bool fiscalYearCalendarEnd, int fiscalYearMonth)
        : guid(guid), fiscalYear(fiscalYear), fiscalYearCalendarEnd(fiscalYearCalendarEnd), fiscalYearMonth(fiscalYearMonth){};

    std::string guid;
    std::string fiscalYear;
    bool fiscalYearCalendarEnd;
    int fiscalYearMonth;
};

#endif //FACILITY_H