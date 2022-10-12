
#ifndef MONTHLYDATA_H
#define MONTHLYDATA_H

class MonthlyData
{

public:
    /**
     * @brief
     *
     */
    MonthlyData(){};
    MonthlyData(
        int month,
        int year,
        double energyUse) : month(month), year(year), energyUse(energyUse){

                                                                                             };

    int month;
    int year;
    double energyUse;
};

#endif //MONTHLYDATA_H