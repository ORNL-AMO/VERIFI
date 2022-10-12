#include "MonthlyData.h"

#ifndef METER_H
#define METER_H

class Meter
{
public:
    /**
     * @brief
     *
     */
    Meter(){};
    Meter(std::string groupId)
        : groupId(groupId)
    {
    }
    std::string groupId;
};



class CalanderizedMeter
{

public:
    /**
     * @brief
     *
     */
    CalanderizedMeter(){};
    CalanderizedMeter(Meter meter, std::vector<MonthlyData> monthlyData)
        : meter(meter), monthlyData(monthlyData){

                        };
    Meter meter;
    std::vector<MonthlyData> monthlyData;
};

#endif //METER_H